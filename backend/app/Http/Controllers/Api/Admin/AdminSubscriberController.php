<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Api\Subscriber\SubscriberController;
use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriberListingResource;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberCreditRequest;
use App\Models\SubscriberListing;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\PasswordPolicyService;
use App\Services\Subscribers\SubscriberStaffNotifier;
use App\Services\Subscribers\SubscriberAdLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin: subscriber accounts (hidden from customers), their ad credits, and "عروض المشتركين".
 */
class AdminSubscriberController extends Controller
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly SubscriberStaffNotifier $notifier,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $subscribers = User::query()
            ->where('role', UserRole::SUBSCRIBER->value)
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->withCount('subscriberListings')
            ->withSum('subscriberAdCredits as credits_balance', 'delta')
            ->withSum(['subscriberAdCredits as credits_purchased' => fn ($q) => $q->where('delta', '>', 0)], 'delta')
            ->withCount(['subscriberCreditRequests as pending_requests_count' => fn ($q) => $q->where('status', SubscriberCreditRequest::STATUS_PENDING)])
            ->withSum(['subscriberAdCredits as amount_paid' => fn ($q) => $q->where('reason', SubscriberAdCredit::REASON_PURCHASE)->where('delta', '>', 0)], 'amount_sar')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $subscribers->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'credits_balance' => (int) ($u->credits_balance ?? 0),
                'credits_purchased' => (int) ($u->credits_purchased ?? 0),
                'bought_count' => (int) $u->subscriber_listings_count,
                'pending_requests_count' => (int) $u->pending_requests_count,
                'amount_paid_sar' => round((float) ($u->amount_paid ?? 0), 2),
                'created_at' => $u->created_at,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $passwordRules = collect(PasswordPolicyService::rulesForField('password'))
            ->reject(fn ($rule) => in_array($rule, ['required', 'confirmed'], true))
            ->prepend('nullable')
            ->values()
            ->all();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => $passwordRules,
            'credits' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'amount_sar' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $plainPassword = $validated['password'] ?? Str::password(12);

        $user = DB::transaction(function () use ($validated, $plainPassword, $request) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => Hash::make($plainPassword),
                'username' => 'subscriber_'.Str::lower(Str::random(10)),
                'role' => UserRole::SUBSCRIBER->value,
            ]);
            // Admin-created account: no email verification step.
            $user->forceFill(['email_verified_at' => now()])->save();

            $credits = (int) ($validated['credits'] ?? 0);
            if ($credits > 0) {
                SubscriberAdCredit::create([
                    'subscriber_id' => $user->id,
                    'delta' => $credits,
                    'reason' => SubscriberAdCredit::REASON_PURCHASE,
                    'created_by' => $request->user()?->id,
                    'note' => $validated['note'] ?? null,
                    'amount_sar' => $validated['amount_sar'] ?? round($credits * (float) config('subscribers.ad_price_sar'), 2),
                ]);
            }

            return $user;
        });

        $this->audit->log('subscriber.created', $user, null, ['credits' => (int) ($validated['credits'] ?? 0)]);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'credits_balance' => $user->adCreditsBalance(),
            ],
            'meta' => [
                'temporary_password' => isset($validated['password']) ? null : $plainPassword,
            ],
        ], 201);
    }

    /** Add credits (e.g. after an offline payment) or correct the balance. */
    public function addCredits(Request $request, User $user): JsonResponse
    {
        abort_unless($user->isSubscriber(), 404);

        $validated = $request->validate([
            'delta' => ['required', 'integer', 'not_in:0', 'between:-10000,10000'],
            'amount_sar' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $delta = (int) $validated['delta'];

        DB::transaction(function () use ($user, $delta, $validated, $request) {
            User::query()->whereKey($user->id)->lockForUpdate()->first();
            if ($user->adCreditsBalance() + $delta < 0) {
                throw ValidationException::withMessages(['delta' => 'لا يمكن أن يصبح الرصيد أقل من صفر.']);
            }
            SubscriberAdCredit::create([
                'subscriber_id' => $user->id,
                'delta' => $delta,
                'reason' => $delta > 0 ? SubscriberAdCredit::REASON_PURCHASE : SubscriberAdCredit::REASON_ADJUST,
                'created_by' => $request->user()?->id,
                'note' => $validated['note'] ?? null,
                'amount_sar' => $delta > 0 ? ($validated['amount_sar'] ?? round($delta * (float) config('subscribers.ad_price_sar'), 2)) : null,
            ]);
        });

        $this->audit->log('subscriber.credits_changed', $user, null, ['delta' => $delta]);

        return response()->json(['data' => ['credits_balance' => $user->adCreditsBalance()]]);
    }

    /** Top-up requests from subscribers (pending first). */
    public function creditRequests(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $rows = SubscriberCreditRequest::query()
            ->when(in_array($status, ['pending', 'approved', 'rejected'], true), fn ($q) => $q->where('status', $status))
            ->with('subscriber:id,name,email,phone')
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $rows->map(fn (SubscriberCreditRequest $r) => $r->toApi()),
            'meta' => ['pending_count' => SubscriberCreditRequest::query()->where('status', SubscriberCreditRequest::STATUS_PENDING)->count()],
        ]);
    }

    /** Approve a top-up request: the credits are added in the same transaction. */
    public function approveCreditRequest(Request $request, SubscriberCreditRequest $creditRequest): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'amount_sar' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $creditRequest = DB::transaction(function () use ($creditRequest, $validated, $request) {
            $row = SubscriberCreditRequest::query()->whereKey($creditRequest->id)->lockForUpdate()->firstOrFail();
            if ($row->status !== SubscriberCreditRequest::STATUS_PENDING) {
                throw ValidationException::withMessages(['status' => 'تمت معالجة هذا الطلب مسبقاً.']);
            }
            $quantity = (int) ($validated['quantity'] ?? $row->quantity);

            SubscriberAdCredit::create([
                'subscriber_id' => $row->subscriber_id,
                'delta' => $quantity,
                'reason' => SubscriberAdCredit::REASON_PURCHASE,
                'created_by' => $request->user()?->id,
                'note' => $validated['admin_note'] ?? ('طلب رصيد #'.$row->id),
                'amount_sar' => $validated['amount_sar'] ?? round($quantity * (float) config('subscribers.ad_price_sar'), 2),
            ]);

            $row->update([
                'status' => SubscriberCreditRequest::STATUS_APPROVED,
                'approved_quantity' => $quantity,
                'amount_sar' => $validated['amount_sar'] ?? round($quantity * (float) config('subscribers.ad_price_sar'), 2),
                'admin_note' => $validated['admin_note'] ?? null,
                'handled_by' => $request->user()?->id,
                'handled_at' => now(),
            ]);

            return $row;
        });

        $this->audit->log('subscriber.credit_request_approved', $creditRequest, null, ['quantity' => $creditRequest->approved_quantity]);
        $this->notifier->notifySubscriber(
            $creditRequest->subscriber_id,
            'subscriber_credit_approved',
            'تمت إضافة رصيد إعلانات',
            'أُضيف '.$creditRequest->approved_quantity.' إعلان إلى رصيدك.',
            ['actions' => [['label' => 'عرض الرصيد', 'href' => '/subscriber/credits', 'intent' => 'open_account']]],
        );

        return response()->json(['data' => $creditRequest->load('subscriber:id,name,email,phone')->toApi()]);
    }

    public function rejectCreditRequest(Request $request, SubscriberCreditRequest $creditRequest): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($creditRequest->status !== SubscriberCreditRequest::STATUS_PENDING) {
            throw ValidationException::withMessages(['status' => 'تمت معالجة هذا الطلب مسبقاً.']);
        }

        $creditRequest->update([
            'status' => SubscriberCreditRequest::STATUS_REJECTED,
            'admin_note' => $validated['admin_note'] ?? null,
            'handled_by' => $request->user()?->id,
            'handled_at' => now(),
        ]);

        $this->audit->log('subscriber.credit_request_rejected', $creditRequest);
        $this->notifier->notifySubscriber(
            $creditRequest->subscriber_id,
            'subscriber_credit_rejected',
            'لم يتم قبول طلب الرصيد',
            $validated['admin_note'] ?? 'تواصل مع الإدارة لمعرفة التفاصيل.',
            ['actions' => [['label' => 'عرض الطلبات', 'href' => '/subscriber/credits', 'intent' => 'open_account']]],
        );

        return response()->json(['data' => $creditRequest->load('subscriber:id,name,email,phone')->toApi()]);
    }

    /** Cancel a bought ad at the property owner's request (optionally refund the ad to the subscriber). */
    public function cancelListing(Request $request, SubscriberListing $subscriberListing, SubscriberAdLifecycleService $lifecycle): JsonResponse
    {
        $validated = $request->validate([
            'refund' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $row = $lifecycle->cancelByOwner($subscriberListing, (bool) $validated['refund'], $validated['reason'] ?? null, $request->user());

        return response()->json(['data' => ['status' => $row->status, 'refunded' => (bool) $row->refunded]]);
    }

    public function markListingSold(Request $request, SubscriberListing $subscriberListing, SubscriberAdLifecycleService $lifecycle): JsonResponse
    {
        $row = $lifecycle->markSold($subscriberListing, $request->user());

        return response()->json(['data' => ['status' => $row->status]]);
    }

    /** "عروض المشتركين": every bought listing, newest note first. */
    public function listings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subscriber_id' => ['nullable', 'integer'],
            'city_id' => ['nullable', 'integer'],
            'property_type' => ['nullable', 'string', 'in:apartment,villa,land,building,floor,shop,farm'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'status' => ['nullable', 'in:active,expired,cancelled,sold'],
        ]);

        $query = SubscriberListing::query()
            ->when(! empty($validated['status']), fn ($q) => $q->where('status', $validated['status']))
            ->when(! empty($validated['subscriber_id']), fn ($q) => $q->where('subscriber_id', $validated['subscriber_id']))
            ->when(! empty($validated['city_id']), fn ($q) => $q->whereHas('product', fn ($p) => $p->where('city_id', $validated['city_id'])))
            ->when(! empty($validated['property_type']), fn ($q) => $q->whereHas('product.realEstateDetail', fn ($d) => $d->where('property_type', $validated['property_type'])))
            ->with(['subscriber:id,name,email', 'product' => fn ($q) => $q->with(['category', 'city', 'seller', 'realEstateDetail'])])
            ->withCount('notes');
        SubscriberListing::withUnreadCountFor($query, (int) $request->user()->id);

        $paginator = SubscriberController::orderByActivity($query)->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json([
            'data' => SubscriberListingResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'unread_total' => SubscriberListing::unreadTotalFor((int) $request->user()->id),
            ],
        ]);
    }
}
