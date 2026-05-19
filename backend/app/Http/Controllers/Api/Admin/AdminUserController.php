<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\Guarantee;
use App\Models\Purchase;
use App\Models\Transaction;
use App\Models\User;
use App\Rules\AroothComEmail;
use App\Services\AssistantUserTypeScope;
use App\Services\AuditLogService;
use App\Services\CompanyVerificationApprovalService;
use App\Services\PasswordPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminUserController extends Controller
{
    private const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'employee'];

    public function __construct(
        private readonly AssistantUserTypeScope $assistantScope,
        private readonly AuditLogService $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->with('city')
            ->when($request->search, fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                    ->orWhere('phone', 'like', '%' . $request->search . '%');
            }))
            ->when($request->role, fn ($q) => $q->where('role', $request->role))
            ->when($request->city_id, fn ($q) => $q->where('city_id', $request->city_id))
            ->when($request->verification_level, fn ($q) => $q->where('verification_level', $request->verification_level))
            ->when($request->member_filter, function ($q) use ($request) {
                $filter = $request->member_filter;
                if ($filter === 'new') {
                    $q->where('created_at', '>=', now()->subDays(7));
                } elseif ($filter === 'cancelled') {
                    $q->where(function ($q) {
                        $q->whereNotNull('banned_at')->orWhereNotNull('suspended_at');
                    });
                } elseif ($filter === 'inactive_1w') {
                    $q->where(function ($q) {
                        $q->whereNull('last_login_at')
                            ->orWhere('last_login_at', '<', now()->subWeek());
                    });
                } elseif ($filter === 'inactive_1m') {
                    $q->where(function ($q) {
                        $q->whereNull('last_login_at')
                            ->orWhere('last_login_at', '<', now()->subMonth());
                    });
                } elseif ($filter === 'inactive_3m') {
                    $q->where(function ($q) {
                        $q->whereNull('last_login_at')
                            ->orWhere('last_login_at', '<', now()->subMonths(3));
                    });
                }
            })
            ->orderByDesc('created_at');

        if ($request->user()) {
            $this->assistantScope->applyToUsersQuery($query, $request->user());
        }

        $users = $query->paginate($request->get('per_page', 20));

        $data = $users->getCollection()->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'role' => $u->role,
            'city_id' => $u->city_id,
            'city' => $u->city ? ['id' => $u->city->id, 'name' => $u->city->name, 'name_ar' => $u->city->name_ar] : null,
            'verification_level' => $u->verification_level,
            'financial_guarantee' => $u->financial_guarantee,
            'banned_at' => $u->banned_at,
            'suspended_at' => $u->suspended_at,
            'last_login_at' => $u->last_login_at,
            'created_at' => $u->created_at,
        ]);

        $users->setCollection($data);

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email', new AroothComEmail],
            'password' => PasswordPolicyService::rulesForField('password'),
            'role' => ['required', 'string', 'in:'.implode(',', self::STAFF_ROLES)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => bcrypt($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'email_verified_at' => now(),
        ]);

        $this->audit->log('admin.staff.create', $user, null, [
            'email' => $user->email,
            'role' => $user->role,
        ], $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'in:super_admin,admin,manager,employee,marketer,company,seller,buyer,user'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'city_id' => ['sometimes', 'nullable', 'integer', 'exists:cities,id'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $user->update($validated);

        return response()->json(['data' => $user->load('city')]);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['city', 'company']);
        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'city_id' => $user->city_id,
                'city' => $user->city ? ['id' => $user->city->id, 'name' => $user->city->name, 'name_ar' => $user->city->name_ar] : null,
                'verification_level' => $user->verification_level,
                'financial_guarantee' => $user->financial_guarantee,
                'banned_at' => $user->banned_at,
                'suspended_at' => $user->suspended_at,
                'last_login_at' => $user->last_login_at,
                'created_at' => $user->created_at,
                'avatar_url' => $user->avatar_url,
                'bio' => $user->bio,
                'balance' => $this->balanceSnapshot($user->id),
            ],
        ]);
    }

    /**
     * Credit user's available or withdrawable balance (finance team / super admin).
     */
    public function creditBalance(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'apply_to' => ['required', 'string', 'in:available,withdrawable'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $amount = (float) $validated['amount'];
        $field = $validated['apply_to'] === 'withdrawable' ? 'withdrawable' : 'available';

        DB::transaction(function () use ($user, $amount, $field, $validated) {
            $balance = Balance::getOrCreateForUser($user->id);
            $balance->increment($field, $amount);

            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_DEPOSIT,
                'amount' => $amount,
                'description' => trim(__('Admin balance credit').($validated['note'] ? ': '.$validated['note'] : '')),
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
                'metadata' => ['source' => 'admin_credit', 'note' => $validated['note'] ?? null],
            ]);
        });

        return response()->json([
            'message' => __('Balance credited successfully.'),
            'data' => [
                'user_id' => $user->id,
                'balance' => $this->balanceSnapshot($user->id),
            ],
        ], 201);
    }

    private function balanceSnapshot(int $userId): array
    {
        $b = Balance::getOrCreateForUser($userId);

        return [
            'available' => (float) $b->available,
            'escrow' => (float) $b->escrow,
            'withdrawable' => (float) ($b->withdrawable ?? 0),
        ];
    }

    public function ban(User $user): JsonResponse
    {
        $user->update(['banned_at' => now()]);
        return response()->json(['data' => $user->fresh(), 'message' => 'User banned']);
    }

    public function unban(User $user): JsonResponse
    {
        $user->update(['banned_at' => null]);
        return response()->json(['data' => $user->fresh(), 'message' => 'User unbanned']);
    }

    public function suspend(User $user): JsonResponse
    {
        $user->update(['suspended_at' => now()]);
        return response()->json(['data' => $user->fresh(), 'message' => 'User suspended']);
    }

    public function unsuspend(User $user): JsonResponse
    {
        $user->update(['suspended_at' => null]);
        return response()->json(['data' => $user->fresh(), 'message' => 'User unsuspended']);
    }

    /**
     * Set verification badge level for a user.
     */
    public function verify(
        Request $request,
        User $user,
        CompanyVerificationApprovalService $approval,
    ): JsonResponse {
        $validated = $request->validate([
            'verification_level' => ['required', 'string', 'in:unverified,email,id_verified,company_verified'],
        ]);

        $user->update([
            'verification_level' => $validated['verification_level'],
            'is_verified' => in_array($validated['verification_level'], ['email', 'id_verified', 'company_verified'], true),
        ]);

        if ($validated['verification_level'] === 'company_verified' && $user->company) {
            $approval->approve($user->company, $request->user()?->id);
        }

        return response()->json(['data' => $user->fresh(), 'message' => 'Verification level updated']);
    }

    /**
     * Admin refund user's financial guarantee to their balance.
     */
    public function refundGuarantee(User $user): JsonResponse
    {
        $amount = (float) ($user->financial_guarantee ?? 0);

        if ($amount <= 0) {
            return response()->json(['message' => 'No guarantee to refund.'], 422);
        }

        DB::transaction(function () use ($user, $amount) {
            Guarantee::where('user_id', $user->id)
                ->where('status', Guarantee::STATUS_ACTIVE)
                ->update(['status' => Guarantee::STATUS_REFUNDED, 'refunded_at' => now()]);

            $user->update(['financial_guarantee' => 0]);

            $balance = Balance::getOrCreateForUser($user->id);
            $balance->increment('available', $amount);
        });

        return response()->json([
            'data' => $user->fresh(),
            'message' => 'Guarantee refunded to user balance.',
        ]);
    }

    /**
     * Partially deduct held financial guarantee (e.g. seller breach / buyer compensation).
     */
    public function deductGuarantee(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:2000'],
            'purchase_id' => ['nullable', 'integer', 'exists:purchases,id'],
        ]);

        $held = (float) ($user->financial_guarantee ?? 0);
        $deduct = (float) $validated['amount'];

        if ($held < $deduct) {
            return response()->json(['message' => __('Deduction exceeds held guarantee.')], 422);
        }

        DB::transaction(function () use ($user, $deduct, $validated) {
            $user->decrement('financial_guarantee', $deduct);

            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_ADMIN_DEDUCTION,
                'amount' => -$deduct,
                'description' => $validated['reason'],
                'purchase_id' => $validated['purchase_id'] ?? null,
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            if (! empty($validated['purchase_id'])) {
                $purchase = Purchase::query()->find((int) $validated['purchase_id']);
                if ($purchase && (int) $purchase->seller_id === (int) $user->id) {
                    $buyerBalance = Balance::getOrCreateForUser((int) $purchase->buyer_id);
                    $buyerBalance->increment('available', $deduct);
                    Transaction::create([
                        'user_id' => $purchase->buyer_id,
                        'type' => Transaction::TYPE_REFUND,
                        'amount' => $deduct,
                        'description' => __('Compensation from seller guarantee (order #:id)', ['id' => $purchase->id]),
                        'purchase_id' => $purchase->id,
                        'status' => Transaction::STATUS_COMPLETED,
                        'completed_at' => now(),
                    ]);
                }
            }
        });

        return response()->json([
            'data' => $user->fresh(),
            'message' => __('Guarantee deduction recorded.'),
        ]);
    }
}
