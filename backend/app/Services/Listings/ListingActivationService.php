<?php

namespace App\Services\Listings;

use App\Models\Product;
use App\Models\User;
use App\Services\Finance\PaymentEligibilityEngine;
use Illuminate\Support\Facades\DB;

class ListingActivationService
{
    public function __construct(
        private readonly PaymentEligibilityEngine $eligibility,
    ) {}

    /**
     * Activate listings blocked only by payout setup once seller can receive payments.
     */
    public function activatePendingForSeller(User $seller): int
    {
        $setup = $this->eligibility->sellerSetupStatus($seller);
        if (! $setup['can_activate_listings']) {
            return 0;
        }

        $now = now();

        return DB::transaction(function () use ($seller, $now) {
            $query = Product::query()
                ->where('user_id', $seller->id)
                ->where('payout_activation_status', 'pending_payout_setup')
                ->where(function ($q) {
                    $q->where('moderation_status', 'approved')
                        ->orWhereNull('moderation_status');
                })
                ->whereNotIn('status', ['deleted', 'sold', 'archived']);

            $count = 0;

            $query->each(function (Product $product) use ($now, &$count) {
                $moderation = (string) ($product->moderation_status ?? 'approved');
                if ($moderation === 'rejected') {
                    return;
                }

                $updates = [
                    'payout_activation_status' => 'active',
                ];

                if ($product->status === 'pending_review' || $product->status === 'hidden') {
                    $updates['status'] = 'published';
                    $updates['published_at'] = $product->published_at ?? $now;
                    $updates['bumped_at'] = $now;
                }

                $product->update($updates);
                $count++;
            });

            return $count;
        });
    }
}
