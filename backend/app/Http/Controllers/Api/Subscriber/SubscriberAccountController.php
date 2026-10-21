<?php

namespace App\Http\Controllers\Api\Subscriber;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ListingFollowUpNote;
use App\Models\Product;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberCreditRequest;
use App\Models\SubscriberListing;
use App\Services\Subscribers\SubscriberStaffNotifier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Subscriber dashboard: overview stats, ad credits (history + top-up requests),
 * contact with the Arooth team, and account details.
 */
class SubscriberAccountController extends Controller
{
    public function __construct(private readonly SubscriberStaffNotifier $notifier) {}

    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();
        $listingIds = SubscriberListing::query()->where('subscriber_id', $user->id)->pluck('id');
        $productIds = SubscriberListing::query()->where('subscriber_id', $user->id)->pluck('product_id');

        $recentNotes = ListingFollowUpNote::query()
            ->whereIn('subscriber_listing_id', $listingIds)
            ->where('author_id', '!=', $user->id)
            ->with(['author:id,name,role', 'subscriberListing.product:id,title'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ListingFollowUpNote $n) => [
                'id' => $n->id,
                'body' => $n->body,
                'created_at' => $n->created_at,
                'author' => $n->author?->name,
                'product_id' => $n->subscriberListing?->product_id,
                'product_title' => $n->subscriberListing?->product?->title,
            ]);

        $pending = SubscriberCreditRequest::query()
            ->where('subscriber_id', $user->id)
            ->where('status', SubscriberCreditRequest::STATUS_PENDING)
            ->latest()
            ->first();

        $money = self::moneyStats($user);
        $byStatus = SubscriberListing::query()->where('subscriber_id', $user->id)
            ->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');

        return response()->json(['data' => [
            ...$money,
            'active_count' => (int) ($byStatus['active'] ?? 0),
            'expired_count' => (int) ($byStatus['expired'] ?? 0),
            'cancelled_count' => (int) ($byStatus['cancelled'] ?? 0),
            'ad_days' => (int) config('subscribers.ad_days'),
            'credits_balance' => $user->adCreditsBalance(),
            'credits_purchased' => (int) $user->subscriberAdCredits()->where('delta', '>', 0)->sum('delta'),
            'credits_used' => (int) $user->subscriberAdCredits()->where('reason', SubscriberAdCredit::REASON_USE)->count(),
            'bought_count' => $listingIds->count(),
            'sold_count' => (int) ($byStatus['sold'] ?? 0),
            'available_count' => Product::query()->publiclyVisibleAwaiting()->count(),
            'notes_count' => ListingFollowUpNote::query()->whereIn('subscriber_listing_id', $listingIds)->count(),
            'unread_total' => SubscriberListing::unreadTotalFor((int) $user->id, (int) $user->id),
            'recent_notes' => $recentNotes,
            'pending_credit_request' => $pending?->toApi(),
        ]]);
    }

    /**
     * SAR figures shown on the subscriber page (PDF note 3): paid for ads, used, refunded, remaining.
     *
     * @return array<string, float>
     */
    public static function moneyStats(User $user): array
    {
        $rows = $user->subscriberAdCredits();
        $paid = (float) (clone $rows)->where('delta', '>', 0)->where('reason', SubscriberAdCredit::REASON_PURCHASE)->sum('amount_sar');
        $used = (float) (clone $rows)->where('reason', SubscriberAdCredit::REASON_USE)->sum('amount_sar');
        $refunded = (float) (clone $rows)->where('reason', SubscriberAdCredit::REASON_REFUND)->sum('amount_sar');

        return [
            'amount_paid_sar' => round($paid, 2),
            'amount_used_sar' => round($used, 2),
            'amount_refunded_sar' => round($refunded, 2),
            'amount_remaining_sar' => round(max(0, $paid - $used + $refunded), 2),
        ];
    }

    /** Credit ledger + the subscriber's top-up requests. */
    public function credits(Request $request): JsonResponse
    {
        $user = $request->user();

        $ledger = $user->subscriberAdCredits()
            ->with('product:id,title')
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (SubscriberAdCredit $c) => [
                'id' => $c->id,
                'delta' => $c->delta,
                'amount_sar' => $c->amount_sar,
                'reason' => $c->reason,
                'note' => $c->note,
                'product' => $c->product ? ['id' => $c->product->id, 'title' => $c->product->title] : null,
                'created_at' => $c->created_at,
            ]);

        $requests = SubscriberCreditRequest::query()
            ->where('subscriber_id', $user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (SubscriberCreditRequest $r) => $r->toApi());

        return response()->json(['data' => [
            ...self::moneyStats($user),
            'balance' => $user->adCreditsBalance(),
            'ledger' => $ledger,
            'requests' => $requests,
        ]]);
    }

    public function requestCredits(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'amount_sar' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $hasPending = SubscriberCreditRequest::query()
            ->where('subscriber_id', $user->id)
            ->where('status', SubscriberCreditRequest::STATUS_PENDING)
            ->exists();
        if ($hasPending) {
            throw ValidationException::withMessages([
                'quantity' => 'لديك طلب رصيد قيد المراجعة. انتظر رد الإدارة أو تواصل معهم.',
            ]);
        }

        $row = SubscriberCreditRequest::create([
            'subscriber_id' => $user->id,
            'quantity' => (int) $validated['quantity'],
            'amount_sar' => $validated['amount_sar'] ?? null,
            'note' => $validated['note'] ?? null,
            'status' => SubscriberCreditRequest::STATUS_PENDING,
        ]);

        $this->notifier->notifyManagers(
            'subscriber_credit_request',
            'طلب رصيد إعلانات جديد',
            $user->name.' يطلب '.$row->quantity.' إعلان.',
            [
                'subscriber_id' => $user->id,
                'credit_request_id' => $row->id,
                'actions' => [
                    ['label' => 'مراجعة الطلب', 'href' => '/admin/subscribers?tab=requests', 'intent' => 'open_admin'],
                ],
            ],
        );

        return response()->json(['data' => $row->toApi()], 201);
    }

    /**
     * Opens (or reuses) a direct conversation with the Arooth team. It appears in /admin/messages
     * and in the subscriber's own inbox.
     */
    public function supportConversation(Request $request): JsonResponse
    {
        $user = $request->user();
        $admin = $this->notifier->supportAdmin();
        if (! $admin) {
            return response()->json(['message' => 'لا يوجد حساب إدارة متاح حالياً.'], 503);
        }

        $conversation = Conversation::firstOrCreate(
            ['dedupe_key' => Conversation::directDedupeKey((int) $admin->id, (int) $user->id)],
            [
                'product_id' => null,
                'buyer_id' => $admin->id,
                'seller_id' => $user->id,
                'conversation_type' => Conversation::TYPE_DIRECT,
            ],
        );

        if ($conversation->wasRecentlyCreated) {
            $this->notifier->notifyManagers(
                'subscriber_support_opened',
                'محادثة جديدة من مشترك',
                $user->name.' فتح محادثة مع الإدارة.',
                [
                    'subscriber_id' => $user->id,
                    'conversation_id' => $conversation->id,
                    'actions' => [
                        ['label' => 'فتح المحادثة', 'href' => '/admin/messages?c='.$conversation->id, 'intent' => 'open_admin'],
                    ],
                ],
            );
        }

        return response()->json(['data' => ['conversation_id' => $conversation->id]], $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function account(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'created_at' => $user->created_at,
        ]]);
    }

    public function updateAccount(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $user->update([
            'name' => trim($validated['name']),
            'phone' => isset($validated['phone']) ? trim($validated['phone']) : null,
        ]);

        return $this->account($request);
    }
}
