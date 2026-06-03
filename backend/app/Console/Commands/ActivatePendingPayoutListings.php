<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Finance\FinanceModuleSettings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ActivatePendingPayoutListings extends Command
{
    protected $signature = 'listings:activate-pending-payout {--dry-run : Show count without updating}';

    protected $description = 'Activate listings stuck on pending_payout_setup (e.g. after disabling bank setup for MVP)';

    public function handle(FinanceModuleSettings $modules): int
    {
        $query = Product::query()
            ->where('payout_activation_status', 'pending_payout_setup')
            ->whereNotIn('status', ['deleted', 'sold', 'archived']);

        $count = (clone $query)->count();

        if ($count === 0) {
            $this->info('No listings with pending_payout_setup found.');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->info("Would activate {$count} listing(s). Payments module enabled: ".($modules->isPaymentsModuleEnabled() ? 'yes' : 'no'));

            return self::SUCCESS;
        }

        $now = now();
        $updated = DB::transaction(function () use ($query, $now) {
            $activated = 0;

            $query->each(function (Product $product) use ($now, &$activated) {
                $updates = ['payout_activation_status' => 'active'];

                if (in_array($product->status, ['pending_review', 'hidden'], true)
                    && ($product->moderation_status ?? 'approved') !== 'rejected') {
                    $updates['status'] = 'published';
                    $updates['published_at'] = $product->published_at ?? $now;
                    $updates['bumped_at'] = $now;
                }

                $product->update($updates);
                $activated++;
            });

            return $activated;
        });

        $this->info("Activated {$updated} listing(s).");

        return self::SUCCESS;
    }
}
