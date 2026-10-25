<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

/**
 * Real-estate offers must show a price (client note: «على السوم» isn't accepted in real estate).
 * New listings are validated; this handles the old ones: list them, or move them to draft so the
 * owner adds a price and republishes. Nothing is deleted.
 */
class UnpublishUnpricedRealEstate extends Command
{
    protected $signature = 'listings:unpriced-real-estate {--apply : Move them to draft (default: only list them)}';

    protected $description = 'List (or unpublish with --apply) real-estate offers without a price';

    public function handle(): int
    {
        $slugs = config('listings.real_estate_category_slugs', ['real-estate']);

        $query = Product::query()
            ->where('status', 'published')
            ->where('type', '!=', 'request')
            ->where('is_wholesale', false)
            ->whereHas('category', fn ($q) => $q->whereIn('slug', $slugs))
            ->where(fn ($q) => $q->whereNull('price')->orWhere('price', '<=', 0));

        $rows = $query->orderBy('id')->get(['id', 'title', 'user_id']);
        if ($rows->isEmpty()) {
            $this->info('No published real-estate offers without a price.');

            return self::SUCCESS;
        }

        $this->table(['id', 'title', 'owner'], $rows->map(fn ($p) => [$p->id, mb_strimwidth($p->title, 0, 60, '…'), $p->user_id])->all());

        if (! $this->option('apply')) {
            $this->line($rows->count().' listing(s). Run again with --apply to move them to draft.');

            return self::SUCCESS;
        }

        $count = $query->update(['status' => 'draft']);
        $this->info("{$count} listing(s) moved to draft — owners can add a price and republish.");

        return self::SUCCESS;
    }
}
