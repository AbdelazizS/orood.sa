<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\AssistantJobRole;
use App\Enums\AssistantUserType;
use App\Http\Controllers\Controller;
use App\Http\Resources\AssistantResource;
use App\Models\Assistant;
use App\Models\User;
use App\Services\AssistantPermissionService;
use App\Services\AuditLogService;
use App\Services\PasswordPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminAssistantController extends Controller
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly AssistantPermissionService $permissions,
    ) {}

    public function meta(): JsonResponse
    {
        return response()->json([
            'data' => [
                'job_roles' => AssistantJobRole::values(),
                'user_types' => AssistantUserType::values(),
                'job_role_permissions' => config('assistants.job_roles', []),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $rows = Assistant::query()
            ->with('user')
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->job_role, fn ($q, $role) => $q->where('job_role', $role))
            ->orderByDesc('created_at')
            ->paginate((int) $request->get('per_page', 20));

        return AssistantResource::collection($rows)->response();
    }

    public function store(Request $request): JsonResponse
    {
        $passwordRules = collect(PasswordPolicyService::rulesForField('password'))
            ->reject(fn ($rule) => in_array($rule, ['required', 'confirmed'], true))
            ->prepend('nullable')
            ->values()
            ->all();

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => $passwordRules,
            'phone' => ['nullable', 'string', 'max:50'],
            'job_role' => ['required', Rule::in(AssistantJobRole::values())],
            'assigned_user_types' => ['required', 'array', 'min:1'],
            'assigned_user_types.*' => [Rule::in(AssistantUserType::values())],
            'status' => ['sometimes', Rule::in([Assistant::STATUS_ACTIVE, Assistant::STATUS_INACTIVE])],
        ]);

        $plainPassword = $validated['password'] ?? Str::password(12);
        $status = $validated['status'] ?? Assistant::STATUS_ACTIVE;

        $assistant = DB::transaction(function () use ($validated, $plainPassword, $status, $request) {
            $username = $this->uniqueUsernameFromEmail($validated['email']);

            $user = User::create([
                'name' => $validated['full_name'],
                'email' => $validated['email'],
                'password' => Hash::make($plainPassword),
                'phone' => $validated['phone'] ?? null,
                'username' => $username,
                'role' => 'assistant',
            ]);

            $assistant = Assistant::create([
                'user_id' => $user->id,
                'job_role' => $validated['job_role'],
                'status' => $status,
                'created_by' => $request->user()?->id,
                'deactivated_at' => $status === Assistant::STATUS_INACTIVE ? now() : null,
            ]);

            $assistant->syncUserTypes($validated['assigned_user_types']);

            if ($status === Assistant::STATUS_INACTIVE) {
                $this->revokeSessions($user);
            }

            return $assistant->load('user');
        });

        $this->audit->log('assistants.created', $assistant, null, [
            'job_role' => $assistant->job_role,
            'assigned_user_types' => $assistant->assignedUserTypes(),
        ], $request->user()?->id);

        return response()->json([
            'data' => new AssistantResource($assistant),
            'meta' => [
                'temporary_password' => isset($validated['password']) ? null : $plainPassword,
            ],
            'message' => __('Assistant created successfully'),
        ], 201);
    }

    public function show(Assistant $assistant): JsonResponse
    {
        $assistant->load('user');

        return response()->json(['data' => new AssistantResource($assistant)]);
    }

    public function update(Request $request, Assistant $assistant): JsonResponse
    {
        $acting = $request->user();
        $isSelf = $acting && $acting->id === $assistant->user_id;

        $validated = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$assistant->user_id],
            'phone' => ['nullable', 'string', 'max:50'],
            'job_role' => $isSelf ? ['prohibited'] : ['sometimes', Rule::in(AssistantJobRole::values())],
            'assigned_user_types' => ['sometimes', 'array', 'min:1'],
            'assigned_user_types.*' => [Rule::in(AssistantUserType::values())],
            'status' => ['sometimes', Rule::in([Assistant::STATUS_ACTIVE, Assistant::STATUS_INACTIVE])],
        ]);

        $before = [
            'job_role' => $assistant->job_role,
            'status' => $assistant->status,
            'assigned_user_types' => $assistant->assignedUserTypes(),
        ];

        DB::transaction(function () use ($assistant, $validated, $isSelf) {
            $user = $assistant->user;
            if (isset($validated['full_name'])) {
                $user->name = $validated['full_name'];
            }
            if (isset($validated['email'])) {
                $user->email = $validated['email'];
            }
            if (array_key_exists('phone', $validated)) {
                $user->phone = $validated['phone'];
            }
            $user->save();

            if (! $isSelf && isset($validated['job_role'])) {
                $assistant->job_role = $validated['job_role'];
            }

            if (isset($validated['status'])) {
                $assistant->status = $validated['status'];
                $assistant->deactivated_at = $validated['status'] === Assistant::STATUS_INACTIVE ? now() : null;
                if ($validated['status'] === Assistant::STATUS_INACTIVE) {
                    $this->revokeSessions($user);
                }
            }

            $assistant->save();

            if (isset($validated['assigned_user_types'])) {
                $assistant->syncUserTypes($validated['assigned_user_types']);
            }
        });

        $this->permissions->forgetCacheForAssistant($assistant);
        $assistant->refresh()->load('user');

        $this->audit->log('assistants.updated', $assistant, $before, [
            'job_role' => $assistant->job_role,
            'status' => $assistant->status,
            'assigned_user_types' => $assistant->assignedUserTypes(),
        ], $request->user()?->id);

        return response()->json([
            'data' => new AssistantResource($assistant),
            'message' => __('Assistant updated successfully'),
        ]);
    }

    public function destroy(Request $request, Assistant $assistant): JsonResponse
    {
        $user = $assistant->user;
        $this->audit->log('assistants.deleted', $assistant, [
            'email' => $user?->email,
        ], null, $request->user()?->id);

        DB::transaction(function () use ($assistant, $user) {
            $assistant->delete();
            if ($user) {
                $this->revokeSessions($user);
                $user->delete();
            }
        });

        return response()->json(['message' => __('Assistant removed successfully')]);
    }

    public function resetPassword(Request $request, Assistant $assistant): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['nullable', 'string', 'min:8', 'max:128'],
        ]);

        $plain = $validated['password'] ?? Str::password(12);
        $user = $assistant->user;
        $user->password = Hash::make($plain);
        $user->save();
        $this->revokeSessions($user);

        $this->audit->log('assistants.password_reset', $assistant, null, null, $request->user()?->id);

        return response()->json([
            'message' => __('Password reset successfully'),
            'meta' => ['temporary_password' => $plain],
        ]);
    }

    private function uniqueUsernameFromEmail(string $email): string
    {
        $base = Str::slug(Str::before($email, '@'), '_') ?: 'assistant';
        $base = Str::limit($base, 40, '');
        $candidate = $base;
        $i = 0;
        while (User::where('username', $candidate)->exists()) {
            $i++;
            $candidate = $base.'_'.$i;
        }

        return $candidate;
    }

    private function revokeSessions(User $user): void
    {
        $user->forceFill([
            'api_token' => null,
            'api_token_expires_at' => null,
        ])->save();
    }
}
