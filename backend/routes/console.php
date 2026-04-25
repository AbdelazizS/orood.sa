<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('stats:backfill-message-count', function () {
    $rows = DB::table('conversations')
        ->select('product_id', DB::raw('COUNT(DISTINCT buyer_id) as unique_buyers'))
        ->groupBy('product_id')
        ->get();

    $updated = 0;
    foreach ($rows as $row) {
        $affected = DB::table('products')
            ->where('id', $row->product_id)
            ->update(['message_count' => (int) $row->unique_buyers]);
        $updated += $affected;
    }

    DB::table('products')
        ->whereNotIn('id', $rows->pluck('product_id')->all())
        ->update(['message_count' => 0]);

    $this->info("Backfill complete. Updated {$updated} products.");
})->purpose('Backfill products.message_count from unique conversation buyers');

Artisan::command('products:backfill-sold-count', function () {
    $counts = DB::table('purchases')
        ->select('product_id', DB::raw('SUM(COALESCE(quantity, 1)) as c'))
        ->where('status', 'completed')
        ->whereNotNull('product_id')
        ->groupBy('product_id')
        ->get()
        ->keyBy('product_id');

    $updated = 0;
    foreach ($counts as $row) {
        $affected = DB::table('products')
            ->where('id', $row->product_id)
            ->update(['sold_count' => (int) $row->c]);
        $updated += $affected;
    }

    $ids = $counts->keys()->filter()->values()->all();
    if ($ids !== []) {
        DB::table('products')->whereNotIn('id', $ids)->update(['sold_count' => 0]);
    } else {
        DB::table('products')->update(['sold_count' => 0]);
    }

    $this->info("Backfill complete. Updated {$updated} products with completed purchases; others set to 0.");
})->purpose('Set products.sold_count from SUM(quantity) of completed purchases per product; others set to 0');
