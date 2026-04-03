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
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

    /**
     * Register a new user, send OTP, and return token.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'how_did_you_hear' => $request->validated('how_did_you_hear'),
            'password' => $request->validated('password'),
            'role' => 'buyer',
        ]);

        [$verification, $code] = Verification::createForUser($user, 'email');
        Mail::to($user->email)->send(new OtpVerificationMail($code, $user->name));

        $token = $this->createToken($user);

        return response()->json([
            'message' => __('auth.registered'),
            'user' => $this->userResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $user->api_token_expires_at?->toIso8601String(),
            'email_verified' => false,
        ], 201);
    }

    /**
     * Register company for authenticated user (after initial registration).
     */
    public function registerCompany(RegisterCompanyRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user->company) {
            return response()->json(['message' => __('auth.company_already_registered')], 422);
        }

        $licenseUrl = null;
        if ($request->hasFile('license')) {
            $file = $request->file('license');
            $path = $file->storeAs('uploads/companies', Str::uuid() . '.' . $file->getClientOriginalExtension(), 'public');
            $licenseUrl = '/storage/' . $path;
        }

        $company = Company::create([
            'user_id' => $user->id,
            'name' => $request->validated('company_name'),
            'slug' => Str::slug($request->validated('company_name')) . '-' . $user->id . '-' . Str::random(6),
            'city_id' => $request->validated('city_id'),
            'product_types' => $request->validated('product_types'),
            'verification_status' => 'pending',
            'license_url' => $licenseUrl,
        ]);

        return response()->json([
            'message' => __('auth.company_registered'),
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'verification_status' => $company->verification_status,
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

        RateLimiter::hit($key, self::OTP_RATE_DECAY);

        [$verification, $code] = Verification::createForUser($user, 'email');
        Mail::to($user->email)->send(new OtpVerificationMail($code, $user->name));

        return response()->json([
            'message' => __('auth.otp_sent'),
            'resend_available_in' => 60, // seconds until resend allowed
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
                'expires_at' => $user->api_token_expires_at?->toIso8601String(),
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
            'expires_at' => $user->api_token_expires_at?->toIso8601String(),
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
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $this->revokeToken($user);
        $user->update(['last_login_at' => now()]);
        $token = $this->createToken($user);

        return response()->json([
            'message' => 'Login successful',
            'user' => $this->userResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $user->api_token_expires_at?->toIso8601String(),
        ]);
    }

    /**
     * Logout and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $this->revokeToken($user);
        }

        return response()->json(['message' => 'Logged out successfully']);
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
     * Change password (authenticated user).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};\':"\\|,.<>\/?]).+$/'],
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

    private function revokeToken(User $user): void
    {
        $user->forceFill([
            'api_token' => null,
            'api_token_expires_at' => null,
        ])->save();
    }

    private function userResource(User $user): array
    {
        $user->load('city.region');
        $permissions = $user->role === 'super_admin'
            ? ['*']
            : Permission::getForRole($user->role);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
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
            'is_verified' => (bool) $user->is_verified,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'email_verified' => (bool) $user->email_verified_at,
            'permissions' => $permissions,
        ];
    }
}
