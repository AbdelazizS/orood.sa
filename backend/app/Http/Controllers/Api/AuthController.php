<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpVerificationMail;
use App\Models\Permission;
use App\Models\User;
use App\Models\Verification;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\RegisterCompanyRequest;
use App\Models\City;
use App\Models\Company;
use App\Services\AdminSettingsService;
use App\Services\PasswordPolicyService;
use App\Support\DateTimeFormat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const OTP_RATE_LIMIT = 3;
    private const OTP_RATE_DECAY = 3600; // 1 hour

    public function __construct(
        private readonly AdminSettingsService $adminSettings
    ) {}

    /**
     * Register a new user (no outbound mail). Email is marked verified so login works without SMTP.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request) {
                $user = User::create([
                    'name' => $request->validated('name'),
                    'email' => $request->validated('email'),
                    'phone' => $request->validated('phone'),
                    'how_did_you_hear' => $request->validated('how_did_you_hear'),
                    'referred_by_marketer_id' => $request->validated('referred_by_marketer_id'),
                    'password' => $request->validated('password'),
                    'role' => $this->adminSettings->getString(AdminSettingsService::KEY_DEFAULT_USER_ROLE, 'buyer'),
                    'email_verified_at' => now(),
                    'is_verified' => true,
                ]);

                $token = $this->createToken($user);
                $user->refresh();

                return response()->json([
                    'message' => __('auth.registered'),
                    'user' => $this->userResource($user),
                    'token' => $token,
                    'token_type' => 'Bearer',
                    'expires_at' => DateTimeFormat::toIso8601($user->api_token_expires_at),
                    'email_verified' => true,
                    'email_verification_sent' => false,
                ], 201);
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => app()->hasDebugModeEnabled()
                    ? $e->getMessage()
                    : __('auth.register_failed'),
            ], 500);
        }
    }

    /**
     * Register company for authenticated user (after initial registration).
     */
    public function registerCompany(RegisterCompanyRequest $request): JsonResponse
    {
        $user = $request->user();
        if (! $this->adminSettings->getBool(AdminSettingsService::KEY_ALLOW_COMPANY_REGISTRATION, true)) {
            return response()->json(['message' => __('auth.company_registration_disabled')], 422);
        }
        if ($user->company) {
            return response()->json(['message' => __('auth.company_already_registered')], 422);
        }

        $licenseUrl = null;
        if ($request->hasFile('license')) {
            $file = $request->file('license');
            $path = $file->storeAs('uploads/companies', Str::uuid() . '.' . $file->getClientOriginalExtension(), 'public');
            $licenseUrl = '/storage/' . $path;
        }

        $cityId = (int) $request->validated('city_id');
        $city = City::query()->find($cityId);

        $company = Company::create([
            'user_id' => $user->id,
            'name' => $request->validated('company_name'),
            'slug' => Str::slug($request->validated('company_name')) . '-' . $user->id . '-' . Str::random(6),
            'city_id' => $cityId,
            'region_id' => $city?->region_id,
            'category_id' => $request->validated('category_id'),
            'product_types' => $request->validated('product_types'),
            'verification_status' => 'pending',
            'license_url' => $licenseUrl,
        ]);

        $user->forceFill([
            'role' => 'company',
            'city_id' => $cityId,
            'company_verification_status' => 'pending',
            'company_verification_note' => null,
        ])->save();

        return response()->json([
            'message' => __('auth.company_registered'),
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'verification_status' => $company->verification_status,
            ],
            'company_status' => [
                'has_company' => true,
                'status' => 'pending',
                'can_post_wholesale' => false,
            ],
        ], 201);
    }

    /**
     * Send OTP to user's email (rate limited: 3 per hour).
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'exists:users,email']]);

        $key = 'otp:' . $request->email;
        if (RateLimiter::tooManyAttempts($key, self::OTP_RATE_LIMIT)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.otp_rate_limit')],
            ]);
        }

        $user = User::where('email', $request->email)->first();
        if ($user->email_verified_at) {
            return response()->json([
                'message' => __('auth.email_already_verified'),
                'email_verified' => true,
            ]);
        }

        [$verification, $code] = Verification::createForUser($user, 'email');
        $sent = $this->sendOtpEmail($user->email, $code, $user->name);
        if ($sent) {
            RateLimiter::hit($key, self::OTP_RATE_DECAY);
        }

        return response()->json([
            'message' => $sent ? __('auth.otp_sent') : __('auth.otp_resend_email_not_sent'),
            'resend_available_in' => 60, // seconds until resend allowed
            'email_verification_sent' => $sent,
        ]);
    }

    /**
     * Confirm email with OTP code.
     */
    public function confirmEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::where('email', $request->email)->first();
        if ($user->email_verified_at) {
            $token = $this->createToken($user);
            return response()->json([
                'message' => __('auth.email_already_verified'),
                'user' => $this->userResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_at' => DateTimeFormat::toIso8601($user->api_token_expires_at),
                'email_verified' => true,
            ]);
        }

        // Temporary: accept any 6-digit code until proper email verification is implemented
        $acceptAnyCode = preg_match('/^\d{6}$/', $request->code);
        if (!$acceptAnyCode) {
            $verification = Verification::where('user_id', $user->id)->where('type', 'email')->first();
            if (!$verification || !$verification->verify($request->code)) {
                if ($verification && $verification->attempts >= 5) {
                    $verification->update(['status' => 'expired']);
                }
                throw ValidationException::withMessages([
                    'code' => [__('auth.invalid_otp')],
                ]);
            }
        }

        $user->forceFill(['email_verified_at' => now(), 'is_verified' => true])->save();

        $token = $this->createToken($user);

        return response()->json([
            'message' => __('auth.email_verified'),
            'user' => $this->userResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => DateTimeFormat::toIso8601($user->api_token_expires_at),
            'email_verified' => true,
        ]);
    }

    /**
     * Login and return API token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (!$user || !Hash::check($request->validated('password'), $user->password)) {
            return response()->json(['message' => __('auth.invalid_credentials')], 401);
        }

        if ($this->adminSettings->getBool(AdminSettingsService::KEY_EMAIL_VERIFICATION_REQUIRED, false) && ! $user->email_verified_at) {
            return response()->json(['message' => __('auth.email_verification_required')], 403);
        }

        if ($user->isAssistant()) {
            $assistant = $user->assistantProfile;
            if (! $assistant || $assistant->status !== \App\Models\Assistant::STATUS_ACTIVE) {
                return response()->json(['message' => __('auth.assistant_inactive')], 403);
            }
        }

        $this->revokeToken($user);
        $user->update(['last_login_at' => now()]);
        $token = $this->createToken($user);

        return response()->json([
            'message' => __('auth.login_success'),
            'user' => $this->userResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => DateTimeFormat::toIso8601($user->api_token_expires_at),
        ]);
    }

    /**
     * Logout and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->markPresenceOffline();
            $this->revokeToken($user);
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Lightweight heartbeat: marks user active for listing/profile presence.
     */
    public function presence(Request $request): JsonResponse
    {
        $request->user()->markPresenceHeartbeat();

        return response()->json(['ok' => true]);
    }

    /**
     * Best-effort "went away" (tab/window close). Uses fetch keepalive from the SPA.
     */
    public function presenceOffline(Request $request): JsonResponse
    {
        $request->user()->markPresenceOffline();

        return response()->json(['ok' => true]);
    }

    /**
     * Public password policy for client-side validation hints.
     */
    public function passwordPolicy(): JsonResponse
    {
        $payload = PasswordPolicyService::responsePayload();
        $payload['hint'] = PasswordPolicyService::rulesDescription(app()->getLocale());

        return response()->json($payload);
    }

    /**
     * Get authenticated user.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return response()->json(['user' => $this->userResource($user)]);
    }

    /**
     * Start email change: verify password, store pending email, send OTP to the new address.
     */
    public function changeEmailRequest(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => ['required', 'string'],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => [__('auth.invalid_password')],
            ]);
        }

        if (strcasecmp($validated['email'], $user->email) === 0) {
            throw ValidationException::withMessages([
                'email' => [__('auth.email_same_as_current')],
            ]);
        }

        $key = 'change-email:'.$user->id;
        if (RateLimiter::tooManyAttempts($key, self::OTP_RATE_LIMIT)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.otp_rate_limit')],
            ]);
        }

        $user->update(['pending_email' => $validated['email']]);

        Verification::where('user_id', $user->id)->where('type', 'email_change')->delete();
        [, $code] = Verification::createForUser($user, 'email_change', 30);
        $sent = $this->sendOtpEmail($validated['email'], $code, $user->name);
        if (! $sent) {
            $user->update(['pending_email' => null]);
            Verification::where('user_id', $user->id)->where('type', 'email_change')->delete();

            return response()->json(['message' => __('auth.otp_resend_email_not_sent')], 422);
        }

        RateLimiter::hit($key, self::OTP_RATE_DECAY);

        return response()->json([
            'message' => __('auth.change_email_otp_sent'),
        ]);
    }

    /**
     * Confirm email change with OTP sent to pending_email.
     */
    public function changeEmailConfirm(Request $request): JsonResponse
    {
        $user = $request->user()->fresh();

        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        if (!$user->pending_email) {
            return response()->json(['message' => __('auth.change_email_no_pending')], 422);
        }

        $verification = Verification::where('user_id', $user->id)->where('type', 'email_change')->first();
        if (!$verification || !$verification->verify($request->code)) {
            if ($verification && $verification->attempts >= 5) {
                $verification->update(['status' => 'expired']);
            }
            throw ValidationException::withMessages([
                'code' => [__('auth.invalid_otp')],
            ]);
        }

        $newEmail = $user->pending_email;
        $user->update([
            'email' => $newEmail,
            'pending_email' => null,
            'email_verified_at' => now(),
        ]);

        return response()->json([
            'message' => __('auth.change_email_success'),
            'user' => $this->userResource($user->fresh()),
        ]);
    }

    /**
     * Change password (authenticated user).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => PasswordPolicyService::rulesForField('password'),
        ], [
            'password.min' => __('auth.validation.password_min'),
            'password.regex' => __('auth.validation.password_rule'),
            'password.confirmed' => __('auth.validation.password_confirmed'),
        ]);

        $user = $request->user();
        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => [__('auth.invalid_password')],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => __('auth.password_changed')]);
    }

    /**
     * Send password reset link.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Password reset link sent to your email']);
        }

        return response()->json(['message' => 'Unable to send reset link'], 400);
    }

    private function createToken(User $user): string
    {
        $token = Str::random(64);
        $user->forceFill([
            'api_token' => hash('sha256', $token),
            'api_token_expires_at' => now()->addDays(30),
        ])->save();

        return $token;
    }

    /** Send OTP email; returns false on transport/config failure (does not throw). */
    private function sendOtpEmail(string $to, string $code, string $userName): bool
    {
        try {
            Mail::to($to)->send(new OtpVerificationMail($code, $userName));

            return true;
        } catch (\Throwable $e) {
            report($e);
            Log::warning('OTP email send failed', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function revokeToken(User $user): void
    {
        $user->forceFill([
            'api_token' => null,
            'api_token_expires_at' => null,
        ])->save();
    }

    private function userResource(User $user): array
    {
        $user->load(['city.region', 'assistantProfile']);
        $permissions = Permission::getForUser($user);
        $assistantPayload = null;
        if ($user->isAssistant() && $user->assistantProfile) {
            $assistantPayload = [
                'job_role' => $user->assistantProfile->job_role,
                'assigned_user_types' => $user->assistantProfile->assignedUserTypes(),
                'status' => $user->assistantProfile->status,
            ];
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'pending_email' => $user->pending_email,
            'phone' => $user->phone,
            'role' => $user->role,
            'bio' => $user->bio,
            'avatar_url' => $user->avatar_url,
            'cover_photo_url' => $user->cover_photo_url,
            'logo_url' => $user->logo_url ?? $user->avatar_url,
            'financial_guarantee' => (float) ($user->financial_guarantee ?? 0),
            'verification_type' => $user->verification_type,
            'verification_level' => $user->verification_level ?? null,
            'city_id' => $user->city_id,
            'city' => $user->city ? [
                'id' => $user->city->id,
                'name' => $user->city->getLocalizedName(request()->header('Accept-Language')),
                'region' => $user->city->region ? [
                    'id' => $user->city->region->id,
                    'name' => $user->city->region->getLocalizedName(request()->header('Accept-Language')),
                ] : null,
            ] : null,
            'location_lat' => $user->location_lat !== null ? (float) $user->location_lat : null,
            'location_lng' => $user->location_lng !== null ? (float) $user->location_lng : null,
            'location_address' => $user->location_address,
            'is_verified' => (bool) $user->is_verified,
            'email_verified_at' => DateTimeFormat::toIso8601($user->email_verified_at),
            'email_verified' => (bool) $user->email_verified_at,
            'created_at' => DateTimeFormat::toIso8601($user->created_at),
            'permissions' => $permissions,
            'assistant' => $assistantPayload,
            'company_verification_status' => $user->company_verification_status ?? 'none',
            'company_verification_note' => $user->company_verification_note,
        ];
    }
}
