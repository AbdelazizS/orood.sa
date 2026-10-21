<?php

namespace App\Services\Subscribers;

use App\Models\Notification;
use App\Models\Product;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberListing;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "شراء الإعلان": a subscriber spends one ad credit to take a listing that is awaiting a marketer.
 * The listing then becomes a normal public listing (price visible) and moves into the subscriber's account.
 */
class SubscriberAdPurchaseService
{
    public function __construct(
        private readonly AuditLogService $audit,
        private readonly SubscriberAdLifecycleService $lifecycle,
    ) {}

    public function buy(User $subscriber, Product $product): SubscriberListing
    {
        $subscriberListing = DB::transaction(function () use ($subscriber, $product) {
            // Lock the subscriber row so two concurrent buys can't spend the same credit.
            User::query()->whereKey($subscriber->id)->lockForUpdate()->first();
            $locked = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isPubliclyVisibleAwaiting()) {
                throw ValidationException::withMessages([
                    'product' => 'هذا العقار لم يعد بانتظار مسوق.',
                ]);
            }
            // One running ad per listing; expired / cancelled ads stay as history.
            $running = SubscriberListing::query()
                ->where('product_id', $locked->id)
                ->whereIn('status', [SubscriberListing::STATUS_ACTIVE, SubscriberListing::STATUS_SOLD])
                ->exists();
            if ($running) {
                throw ValidationException::withMessages([
                    'product' => 'تم شراء إعلان هذا العقار من مشترك آخر.',
                ]);
            }
            if ($subscriber->adCreditsBalance() < 1) {
                throw ValidationException::withMessages([
                    'credits' => 'رصيد الإعلانات غير كافٍ.',
                ]);
            }

            SubscriberAdCredit::create([
                'subscriber_id' => $subscriber->id,
                'delta' => -1,
                'reason' => SubscriberAdCredit::REASON_USE,
                'product_id' => $locked->id,
                'amount_sar' => $this->lifecycle->unitPrice($subscriber),
            ]);

            $row = SubscriberListing::create([
                'product_id' => $locked->id,
                'subscriber_id' => $subscriber->id,
                'purchased_at' => now(),
                'status' => SubscriberListing::STATUS_ACTIVE,
                'expires_at' => now()->addDays((int) config('subscribers.ad_days')),
            ]);

            $now = now();
            $locked->update([
                'marketing_status' => Product::MARKETING_MARKETED,
                'status' => 'published',
                'moderation_status' => $locked->moderation_status ?? 'approved',
                'published_at' => $locked->published_at ?? $now,
                'bumped_at' => $now,
            ]);

            return $row;
        });

        $this->audit->log('subscriber.ad_purchased', $product, null, [
            'subscriber_id' => $subscriber->id,
            'product_id' => $product->id,
        ], $subscriber->id);

        $this->notifyOwner($product->fresh());

        return $subscriberListing->load('product');
    }

    /** The owner is told the listing is now marketed — never who the subscriber is. */
    private function notifyOwner(Product $product): void
    {
        Notification::create([
            'user_id' => $product->user_id,
            'type' => 'listing_marketed',
            'title' => 'تم تسويق عقارك',
            'body' => 'أصبح إعلانك «'.$product->title.'» معروضاً بالسعر لجميع الزوار.',
            'data' => [
                'product_id' => $product->id,
                'actions' => [
                    ['label' => 'عرض الإعلان', 'href' => '/products/'.$product->id, 'intent' => 'open_listing'],
                ],
            ],
        ]);
    }
}
