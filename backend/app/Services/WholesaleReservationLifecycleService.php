<?php

namespace App\Services;

use App\Models\GroupBuyReservation;
use App\Models\Notification;
use App\Models\Product;
use App\Support\InAppNotificationPayload;
use Illuminate\Support\Carbon;

class WholesaleReservationLifecycleService
{
    public const CHECKOUT_WINDOW_MINUTES = 180;

    public function syncProductProgress(Product $product): array
    {
        $target = max(1, (int) ($product->min_quantity ?? 0));
        $activeStatuses = [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING];

        $reserved = (int) GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->whereIn('status', $activeStatuses)
            ->sum('quantity');

        $filled = $reserved >= $target;
        $checkoutDeadline = null;

        if ($filled) {
            $checkoutDeadline = now()->addMinutes(self::CHECKOUT_WINDOW_MINUTES);
            GroupBuyReservation::query()
                ->where('product_id', $product->id)
                ->where('status', GroupBuyReservation::STATUS_PENDING)
                ->update([
                    'status' => GroupBuyReservation::STATUS_PAYMENT_PENDING,
                    'checkout_expires_at' => $checkoutDeadline,
                    'price_snapshot' => $product->wholesale_price ?? $product->price,
                ]);

            $this->notifyCompletedParticipants($product, $checkoutDeadline);
        }

        return [
            'target' => $target,
            'reserved' => $reserved,
            'remaining' => max(0, $target - $reserved),
            'filled' => $filled,
            'checkout_deadline' => $checkoutDeadline,
        ];
    }

    public function expireOverdueReservations(Product $product): void
    {
        $now = now();
        GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->where('status', GroupBuyReservation::STATUS_PAYMENT_PENDING)
            ->whereNotNull('checkout_expires_at')
            ->where('checkout_expires_at', '<', $now)
            ->update([
                'status' => GroupBuyReservation::STATUS_EXPIRED,
            ]);
    }

    private function notifyCompletedParticipants(Product $product, Carbon $checkoutDeadline): void
    {
        $rows = GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->where('status', GroupBuyReservation::STATUS_PAYMENT_PENDING)
            ->whereNull('completed_notified_at')
            ->get();

        foreach ($rows as $row) {
            Notification::create(
                InAppNotificationPayload::wholesaleCampaignCompleted(
                    userId: (int) $row->user_id,
                    product: $product,
                    reservationId: (int) $row->id,
                    checkoutDeadlineIso: $checkoutDeadline->toIso8601String(),
                )
            );
            $row->update(['completed_notified_at' => now()]);
        }
    }
}
