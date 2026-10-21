<?php

namespace App\Services\Subscribers;

use App\Models\Product;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberListing;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * What happens to a bought ad after the purchase (client PDF, note 3):
 * - it runs for N days, then expires (the listing goes back to "awaiting a marketer");
 * - it can be cancelled at the property owner's request (optionally refunding the ad to the subscriber);
 * - it can be marked sold.
 */
class SubscriberAdLifecycleService
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly SubscriberStaffNotifier $notifier,
    ) {}

    /** Average SAR value of one ad for this subscriber (what they paid ÷ ads bought), or the default price. */
    public function unitPrice(User $subscriber): float
    {
        $bought = $subscriber->subscriberAdCredits()->where('reason', SubscriberAdCredit::REASON_PURCHASE)->where('delta', '>', 0);
        $credits = (int) (clone $bought)->sum('delta');
        $paid = (float) (clone $bought)->sum('amount_sar');

        return $credits > 0 && $paid > 0 ? round($paid / $credits, 2) : (float) config('subscribers.ad_price_sar');
    }

    /** Expire every active ad past its end date. Returns how many ended. */
    public function expireDue(): int
    {
        $count = 0;
        SubscriberListing::query()
            ->where('status', SubscriberListing::STATUS_ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->with('product')
            ->chunkById(100, function ($rows) use (&$count) {
                foreach ($rows as $row) {
                    DB::transaction(function () use ($row) {
                        $row->update([
                            'status' => SubscriberListing::STATUS_EXPIRED,
                            'ended_at' => now(),
                            'end_reason' => 'انتهت مدة الإعلان',
                        ]);
                        // Back on the market for marketers (price hidden again), unless it was sold/removed.
                        if ($row->product && ! in_array($row->product->status, ['sold', 'deleted', 'archived'], true)) {
                            $row->product->update(['marketing_status' => Product::MARKETING_AWAITING]);
                        }
                    });
                    $this->notifier->notifySubscriber(
                        $row->subscriber_id,
                        'subscriber_ad_expired',
                        'انتهت مدة إعلان عقار',
                        'انتهت مدة إعلان «'.($row->product?->title ?? 'العقار').'».',
                        ['actions' => [['label' => 'عروضي', 'href' => '/subscriber/my-listings', 'intent' => 'open_account']]],
                    );
                    $count++;
                }
            });

        return $count;
    }

    /** Cancelled at the property owner's request (handled by Arooth staff). */
    public function cancelByOwner(SubscriberListing $row, bool $refund, ?string $reason, User $actor): SubscriberListing
    {
        $this->ensureActive($row);

        DB::transaction(function () use ($row, $refund, $reason, $actor) {
            $row->update([
                'status' => SubscriberListing::STATUS_CANCELLED,
                'ended_at' => now(),
                'end_reason' => $reason ?: 'أُلغي الإعلان بطلب صاحب العقار',
                'refunded' => $refund,
            ]);

            if ($refund) {
                $used = SubscriberAdCredit::query()
                    ->where('subscriber_id', $row->subscriber_id)
                    ->where('product_id', $row->product_id)
                    ->where('reason', SubscriberAdCredit::REASON_USE)
                    ->latest('id')
                    ->first();
                SubscriberAdCredit::create([
                    'subscriber_id' => $row->subscriber_id,
                    'delta' => 1,
                    'reason' => SubscriberAdCredit::REASON_REFUND,
                    'product_id' => $row->product_id,
                    'created_by' => $actor->id,
                    'amount_sar' => $used?->amount_sar,
                    'note' => 'استرجاع إعلان: إلغاء بطلب صاحب العقار',
                ]);
            }

            // The owner withdrew the property: take it off the site.
            $row->product?->update(['status' => 'archived', 'marketing_status' => null]);
        });

        $this->audit->log('subscriber_listing.cancelled_by_owner', $row, null, ['refund' => $refund, 'reason' => $reason], $actor->id);
        $this->notifier->notifySubscriber(
            $row->subscriber_id,
            'subscriber_ad_cancelled',
            'أُلغي إعلان بطلب صاحب العقار',
            '«'.($row->product?->title ?? 'العقار').'»'.($refund ? ' — أُعيد الإعلان إلى رصيدك.' : ''),
            ['actions' => [['label' => 'الرصيد', 'href' => '/subscriber/credits', 'intent' => 'open_account']]],
        );

        return $row->fresh();
    }

    public function markSold(SubscriberListing $row, User $actor): SubscriberListing
    {
        $this->ensureActive($row);

        DB::transaction(function () use ($row) {
            $row->update([
                'status' => SubscriberListing::STATUS_SOLD,
                'ended_at' => now(),
                'end_reason' => 'تم بيع العقار',
            ]);
            $row->product?->update(['status' => 'sold']);
        });

        $this->audit->log('subscriber_listing.sold', $row, null, null, $actor->id);

        return $row->fresh();
    }

    private function ensureActive(SubscriberListing $row): void
    {
        if ($row->status !== SubscriberListing::STATUS_ACTIVE) {
            throw ValidationException::withMessages(['status' => 'هذا الإعلان منتهٍ بالفعل.']);
        }
    }
}
