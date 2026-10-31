<?php

namespace App\Services\Analytics;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Turns detailed events into permanent daily statistics (Saudi calendar days).
 *
 * - Events part (views, unique viewers, searches) comes from page_visits / analytics_search_events and is
 *   rebuilt for a day only while that day's raw events still exist (younger than the retention window).
 * - Sales part comes from purchases (business records, never deleted) and can be rebuilt for any day,
 *   so an order completed weeks after it was placed is still reflected.
 *
 * Every rebuild recomputes the full totals for the day and replaces the stored rows in one transaction:
 * re-running never double-counts, and late events are picked up by re-running recent days.
 */
class AnalyticsAggregator
{
    public function timezone(): string
    {
        return (string) config('analytics.timezone', 'Asia/Riyadh');
    }

    /** Saudi calendar day → [start, end) in UTC. */
    public function dayBounds(string $date): array
    {
        $start = CarbonImmutable::parse($date, $this->timezone())->startOfDay();

        return [$start->utc(), $start->addDay()->utc()];
    }

    public function today(): string
    {
        return CarbonImmutable::now($this->timezone())->toDateString();
    }

    /** Raw events of days before this date may already have been deleted. */
    public function rawCutoffDate(): string
    {
        return CarbonImmutable::now($this->timezone())->subDays(\App\Support\DataRetentionSettings::get()['raw_days'])->toDateString();
    }

    /**
     * Aggregate one day. Events are skipped for days older than the raw window (their stored totals are kept).
     *
     * @return array{date: string, events: bool, products_viewed: int, products_sold: int}
     */
    public function aggregateDay(string $date, bool $events = true, bool $sales = true, bool $forceEvents = false): array
    {
        $date = CarbonImmutable::parse($date)->toDateString();
        // $forceEvents: the caller knows the raw events of this old day still exist (cleanup safety net).
        // Days whose raw events were deleted keep their stored numbers (never rebuilt from empty tables).
        $purged = DB::table('analytics_aggregated_days')->where('date', $date)->whereNotNull('raw_purged_at')->exists();
        $withEvents = $events && ($forceEvents || ($date >= $this->rawCutoffDate() && ! $purged));
        [$from, $to] = $this->dayBounds($date);

        $result = ['date' => $date, 'events' => $withEvents, 'products_viewed' => 0, 'products_sold' => 0];

        DB::transaction(function () use ($date, $from, $to, $withEvents, $sales, $forceEvents, &$result) {
            if ($withEvents) {
                $result['products_viewed'] = $this->rebuildViews($date, $from, $to);
                $this->rebuildSearchTerms($date, $from, $to);
            }
            if ($sales) {
                $result['products_sold'] = $this->rebuildSales($date, $from, $to);
            }
            $this->rebuildMarket($date, $from, $to, $withEvents, $sales);

            $final = $forceEvents || CarbonImmutable::now($this->timezone())->subDays((int) config('analytics.late_days', 2))->toDateString() > $date;
            $existing = DB::table('analytics_aggregated_days')->where('date', $date)->first();
            $row = [
                'events_aggregated_at' => $withEvents ? now() : ($existing->events_aggregated_at ?? null),
                'events_final' => $withEvents ? $final : (bool) ($existing->events_final ?? false),
                'sales_aggregated_at' => $sales ? now() : ($existing->sales_aggregated_at ?? null),
            ];
            DB::table('analytics_aggregated_days')->updateOrInsert(['date' => $date], $row);
        });

        return $result;
    }

    /** Product dimensions (title / section / city / seller) for snapshots. */
    private function productSnapshots(Collection $ids): Collection
    {
        if ($ids->isEmpty()) {
            return collect();
        }

        return DB::table('products')
            ->whereIn('id', $ids->unique()->values())
            ->get(['id', 'title', 'category_id', 'city_id', 'user_id'])
            ->keyBy('id');
    }

    private function rebuildViews(string $date, $from, $to): int
    {
        $rows = DB::table('page_visits')
            ->whereNotNull('product_id')
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->groupBy('product_id')
            ->selectRaw('product_id, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS member_viewers, COUNT(DISTINCT CASE WHEN visitor_id IS NULL THEN ip_address END) AS guest_viewers')
            ->get();

        $snap = $this->productSnapshots($rows->pluck('product_id'));
        $now = now();
        DB::table('analytics_daily_product_views')->where('date', $date)->delete();
        foreach ($rows->chunk(500) as $chunk) {
            DB::table('analytics_daily_product_views')->insert($chunk->map(fn ($r) => [
                'date' => $date,
                'product_id' => (int) $r->product_id,
                'views' => (int) $r->views,
                // Unique viewers = distinct signed-in viewers + distinct IPs of guests (approximate for guests).
                'unique_viewers' => (int) $r->member_viewers + (int) $r->guest_viewers,
                'title' => mb_substr((string) ($snap[$r->product_id]->title ?? ''), 0, 200) ?: null,
                'category_id' => (int) ($snap[$r->product_id]->category_id ?? 0),
                'city_id' => (int) ($snap[$r->product_id]->city_id ?? 0),
                'seller_id' => $snap[$r->product_id]->user_id ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ])->values()->all());
        }

        return $rows->count();
    }

    private function rebuildSales(string $date, $from, $to): int
    {
        $completed = config('analytics.completed_statuses', ['completed', 'delivered']);
        $in = implode(',', array_fill(0, count($completed), '?'));

        $rows = DB::table('purchases')
            ->whereNotNull('product_id')
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->groupBy('product_id')
            ->selectRaw(
                "product_id, COUNT(*) AS orders,
                 SUM(CASE WHEN status IN ($in) THEN 1 ELSE 0 END) AS completed_orders,
                 SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
                 SUM(CASE WHEN status = 'cancelled' AND admin_refund_reason IS NOT NULL THEN 1 ELSE 0 END) AS refunded_orders,
                 SUM(CASE WHEN status IN ($in) THEN amount ELSE 0 END) AS completed_revenue,
                 COUNT(DISTINCT CASE WHEN status IN ($in) THEN buyer_id END) AS buyers",
                [...$completed, ...$completed, ...$completed],
            )
            ->get();

        $snap = $this->productSnapshots($rows->pluck('product_id'));
        $now = now();
        DB::table('analytics_daily_product_sales')->where('date', $date)->delete();
        foreach ($rows->chunk(500) as $chunk) {
            DB::table('analytics_daily_product_sales')->insert($chunk->map(fn ($r) => [
                'date' => $date,
                'product_id' => (int) $r->product_id,
                'orders' => (int) $r->orders,
                'completed_orders' => (int) $r->completed_orders,
                'cancelled_orders' => (int) $r->cancelled_orders,
                'refunded_orders' => (int) $r->refunded_orders,
                'completed_revenue' => round((float) $r->completed_revenue, 2),
                'buyers' => (int) $r->buyers,
                'title' => mb_substr((string) ($snap[$r->product_id]->title ?? ''), 0, 200) ?: null,
                'category_id' => (int) ($snap[$r->product_id]->category_id ?? 0),
                'city_id' => (int) ($snap[$r->product_id]->city_id ?? 0),
                'seller_id' => $snap[$r->product_id]->user_id ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ])->values()->all());
        }

        return $rows->count();
    }

    private function rebuildSearchTerms(string $date, $from, $to): void
    {
        $base = fn () => DB::table('analytics_search_events')->where('created_at', '>=', $from)->where('created_at', '<', $to);
        $now = now();
        $rows = [];
        // All four groupings: per city × section, per city, per section, overall (0 = all).
        foreach ([['city_id', 'category_id'], ['city_id'], ['category_id'], []] as $dims) {
            $q = $base()->selectRaw('term, COUNT(*) AS searches, SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) AS zero_results'.($dims ? ', '.implode(', ', $dims) : ''))
                ->groupBy('term', ...$dims);
            foreach ($q->get() as $r) {
                $city = in_array('city_id', $dims, true) ? (int) $r->city_id : 0;
                $cat = in_array('category_id', $dims, true) ? (int) $r->category_id : 0;
                // Rows with city/section 0 are already "all"; skip duplicates of the overall grouping.
                if ($dims !== [] && $city === 0 && $cat === 0) {
                    continue;
                }
                if (count($dims) === 2 && ($city === 0 || $cat === 0)) {
                    continue;
                }
                $rows[] = [
                    'date' => $date, 'term' => $r->term, 'city_id' => $city, 'category_id' => $cat,
                    'searches' => (int) $r->searches, 'zero_result_searches' => (int) $r->zero_results,
                    'created_at' => $now, 'updated_at' => $now,
                ];
            }
        }
        DB::table('analytics_daily_search_terms')->where('date', $date)->delete();
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('analytics_daily_search_terms')->insert($chunk);
        }
    }

    /** Market rows for the day: every city × section, every city, every section and the overall total. */
    private function rebuildMarket(string $date, $from, $to, bool $events, bool $sales): void
    {
        $groupings = [['city_id', 'category_id'], ['city_id'], ['category_id'], []];
        $cells = [];
        $cell = function (int $city, int $cat) use (&$cells) {
            $key = $city.'|'.$cat;
            if (! isset($cells[$key])) {
                $cells[$key] = ['city_id' => $city, 'category_id' => $cat];
            }

            return $key;
        };

        if ($events) {
            foreach ($groupings as $dims) {
                $q = DB::table('page_visits as v')
                    ->join('products as p', 'p.id', '=', 'v.product_id')
                    ->where('v.created_at', '>=', $from)->where('v.created_at', '<', $to)
                    ->selectRaw('COUNT(*) AS views, COUNT(DISTINCT v.visitor_id) AS mv, COUNT(DISTINCT CASE WHEN v.visitor_id IS NULL THEN v.ip_address END) AS gv'
                        .($dims ? ', '.implode(', ', array_map(fn ($d) => "COALESCE(p.$d, 0) AS $d", $dims)) : ''));
                foreach ($dims as $d) {
                    $q->groupBy("p.$d");
                }
                foreach ($q->get() as $r) {
                    $k = $this->cellKey($cell, $dims, $r);
                    if ($k === null) {
                        continue;
                    }
                    $cells[$k]['views'] = (int) $r->views;
                    $cells[$k]['unique_viewers'] = (int) $r->mv + (int) $r->gv;
                }

                $s = DB::table('analytics_search_events')
                    ->where('created_at', '>=', $from)->where('created_at', '<', $to)
                    ->selectRaw('COUNT(*) AS searches, SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) AS zero_results'.($dims ? ', '.implode(', ', $dims) : ''));
                foreach ($dims as $d) {
                    $s->groupBy($d);
                }
                foreach ($s->get() as $r) {
                    $k = $this->cellKey($cell, $dims, $r);
                    if ($k === null) {
                        continue;
                    }
                    $cells[$k]['searches'] = (int) $r->searches;
                    $cells[$k]['zero_result_searches'] = (int) $r->zero_results;
                }
            }
        }

        if ($sales) {
            $completed = config('analytics.completed_statuses', ['completed', 'delivered']);
            $in = implode(',', array_fill(0, count($completed), '?'));
            foreach ($groupings as $dims) {
                $q = DB::table('purchases as o')
                    ->join('products as p', 'p.id', '=', 'o.product_id')
                    ->where('o.created_at', '>=', $from)->where('o.created_at', '<', $to)
                    ->selectRaw(
                        "COUNT(*) AS orders,
                         SUM(CASE WHEN o.status IN ($in) THEN 1 ELSE 0 END) AS completed_orders,
                         SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
                         SUM(CASE WHEN o.status = 'cancelled' AND o.admin_refund_reason IS NOT NULL THEN 1 ELSE 0 END) AS refunded_orders,
                         SUM(CASE WHEN o.status IN ($in) THEN o.amount ELSE 0 END) AS completed_revenue,
                         COUNT(DISTINCT CASE WHEN o.status IN ($in) THEN o.buyer_id END) AS buyers"
                        .($dims ? ', '.implode(', ', array_map(fn ($d) => "COALESCE(p.$d, 0) AS $d", $dims)) : ''),
                        [...$completed, ...$completed, ...$completed],
                    );
                foreach ($dims as $d) {
                    $q->groupBy("p.$d");
                }
                foreach ($q->get() as $r) {
                    $k = $this->cellKey($cell, $dims, $r);
                    if ($k === null) {
                        continue;
                    }
                    $cells[$k]['orders'] = (int) $r->orders;
                    $cells[$k]['completed_orders'] = (int) $r->completed_orders;
                    $cells[$k]['cancelled_orders'] = (int) $r->cancelled_orders;
                    $cells[$k]['refunded_orders'] = (int) $r->refunded_orders;
                    $cells[$k]['completed_revenue'] = round((float) $r->completed_revenue, 2);
                    $cells[$k]['buyers'] = (int) $r->buyers;
                }
            }
        }

        // Replace only the parts rebuilt now; keep the other part's stored numbers (e.g. old days' views).
        $eventCols = ['views', 'unique_viewers', 'searches', 'zero_result_searches'];
        $salesCols = ['orders', 'completed_orders', 'cancelled_orders', 'refunded_orders', 'completed_revenue', 'buyers'];
        $resetCols = array_merge($events ? $eventCols : [], $sales ? $salesCols : []);
        if ($resetCols) {
            DB::table('analytics_daily_market_stats')->where('date', $date)->update(array_fill_keys($resetCols, 0) + ['updated_at' => now()]);
        }
        $now = now();
        foreach ($cells as $c) {
            $values = ['updated_at' => $now];
            foreach ($resetCols as $col) {
                $values[$col] = $c[$col] ?? 0;
            }
            $exists = DB::table('analytics_daily_market_stats')->where('date', $date)->where('city_id', $c['city_id'])->where('category_id', $c['category_id'])->exists();
            if ($exists) {
                DB::table('analytics_daily_market_stats')->where('date', $date)->where('city_id', $c['city_id'])->where('category_id', $c['category_id'])->update($values);
            } else {
                DB::table('analytics_daily_market_stats')->insert($values + ['date' => $date, 'city_id' => $c['city_id'], 'category_id' => $c['category_id'], 'created_at' => $now]);
            }
        }
        // Rows that are now all zero carry no information.
        DB::table('analytics_daily_market_stats')->where('date', $date)
            ->where('views', 0)->where('searches', 0)->where('orders', 0)->delete();
    }

    /**
     * Cell for a grouped row; null when a broken-down dimension is missing (e.g. a listing without a
     * city), so it never lands in — and overwrites — the "all" cell. It still counts in the overall row.
     */
    private function cellKey(callable $cell, array $dims, object $r): ?string
    {
        $city = in_array('city_id', $dims, true) ? (int) $r->city_id : 0;
        $cat = in_array('category_id', $dims, true) ? (int) $r->category_id : 0;
        if ((in_array('city_id', $dims, true) && $city === 0) || (in_array('category_id', $dims, true) && $cat === 0)) {
            return null;
        }

        return $cell($city, $cat);
    }

    /** Days whose sales may have changed since $since (orders placed or updated), so they can be rebuilt. */
    public function daysWithChangedSales(\DateTimeInterface $since): array
    {
        return DB::table('purchases')
            ->where('updated_at', '>=', $since)
            ->pluck('created_at')
            ->map(fn ($ts) => CarbonImmutable::parse($ts, 'UTC')->setTimezone($this->timezone())->toDateString())
            ->unique()->sort()->values()->all();
    }
}
