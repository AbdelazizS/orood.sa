<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\City;
use App\Services\Analytics\AnalyticsAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * GET /admin/market-analytics — market intelligence from the permanent daily aggregates only
 * (never from raw events), so any past year stays available after raw events are deleted.
 * Dates are Saudi calendar days (config analytics.timezone). The previous period has the same length.
 */
class AdminMarketAnalyticsController extends Controller
{
    public function __invoke(Request $request, AnalyticsAggregator $aggregator): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'city_id' => ['nullable', 'integer'],
            'category_id' => ['nullable', 'integer'],
        ]);
        $tz = $aggregator->timezone();
        $to = CarbonImmutable::parse($validated['to'] ?? $aggregator->today(), $tz)->startOfDay();
        $from = CarbonImmutable::parse($validated['from'] ?? $to->subDays(29)->toDateString(), $tz)->startOfDay();
        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }
        $days = (int) $from->diffInDays($to) + 1;
        $prevTo = $from->subDay();
        $prevFrom = $prevTo->subDays($days - 1);
        $range = [$from->toDateString(), $to->toDateString()];
        $prevRange = [$prevFrom->toDateString(), $prevTo->toDateString()];
        $cityFilter = (int) ($validated['city_id'] ?? 0);
        $categoryFilter = (int) ($validated['category_id'] ?? 0);
        $locale = $request->header('Accept-Language');

        $cityNames = City::query()->get()->mapWithKeys(fn ($c) => [$c->id => $c->getLocalizedName($locale)]);
        $categoryNames = Category::query()->get()->mapWithKeys(fn ($c) => [$c->id => method_exists($c, 'getLocalizedName') ? $c->getLocalizedName($locale) : $c->name]);

        return response()->json(['data' => [
            'period' => ['from' => $range[0], 'to' => $range[1], 'days' => $days],
            'previous_period' => ['from' => $prevRange[0], 'to' => $prevRange[1]],
            'summary' => $this->summary($range, $cityFilter, $categoryFilter),
            'previous_summary' => $this->summary($prevRange, $cityFilter, $categoryFilter),
            'products' => $this->products($range, $prevRange, $cityFilter, $categoryFilter, $cityNames, $categoryNames),
            'cities' => $this->dimension('city_id', $range, $prevRange, $categoryFilter, $cityNames),
            'categories' => $this->dimension('category_id', $range, $prevRange, $cityFilter, $categoryNames),
            'search' => $this->search($range, $prevRange, $cityFilter, $categoryFilter),
            'trend' => $this->trend($range, $days, $cityFilter, $categoryFilter),
            'meta' => [
                'timezone' => $tz,
                'raw_retention_days' => (int) config('analytics.raw_retention_days'),
                'first_aggregated_date' => DB::table('analytics_aggregated_days')->min('date'),
                'last_aggregated_at' => DB::table('analytics_aggregated_days')->max('events_aggregated_at'),
                'completed_statuses' => config('analytics.completed_statuses'),
                'filters' => ['city_id' => $cityFilter ?: null, 'category_id' => $categoryFilter ?: null],
            ],
        ]]);
    }

    private function market(array $range, int $city, int $category)
    {
        return DB::table('analytics_daily_market_stats')
            ->whereBetween('date', $range)
            ->where('city_id', $city)
            ->where('category_id', $category);
    }

    private function summary(array $range, int $city, int $category): array
    {
        $r = $this->market($range, $city, $category)->selectRaw(
            'COALESCE(SUM(views),0) views, COALESCE(SUM(unique_viewers),0) unique_viewers, COALESCE(SUM(searches),0) searches,
             COALESCE(SUM(zero_result_searches),0) zero_result_searches, COALESCE(SUM(orders),0) orders,
             COALESCE(SUM(completed_orders),0) completed_orders, COALESCE(SUM(cancelled_orders),0) cancelled_orders,
             COALESCE(SUM(refunded_orders),0) refunded_orders, COALESCE(SUM(completed_revenue),0) completed_revenue, COALESCE(SUM(buyers),0) buyers'
        )->first();
        $views = (int) $r->views;
        $completed = (int) $r->completed_orders;
        $revenue = round((float) $r->completed_revenue, 2);

        return [
            'views' => $views,
            'unique_viewers' => (int) $r->unique_viewers,
            'searches' => (int) $r->searches,
            'zero_result_searches' => (int) $r->zero_result_searches,
            'orders' => (int) $r->orders,
            'completed_orders' => $completed,
            'cancelled_orders' => (int) $r->cancelled_orders,
            'refunded_orders' => (int) $r->refunded_orders,
            'completed_revenue' => $revenue,
            'buyers' => (int) $r->buyers,
            'average_order_value' => $completed ? round($revenue / $completed, 2) : null,
            'conversion_rate' => $views ? round(100 * $completed / $views, 2) : null,
        ];
    }

    private function productQuery(string $table, array $range, int $city, int $category)
    {
        return DB::table($table)->whereBetween('date', $range)
            ->when($city, fn ($q) => $q->where('city_id', $city))
            ->when($category, fn ($q) => $q->where('category_id', $category));
    }

    private function products(array $range, array $prevRange, int $city, int $category, Collection $cityNames, Collection $categoryNames): array
    {
        $views = $this->productQuery('analytics_daily_product_views', $range, $city, $category)
            ->groupBy('product_id')
            ->selectRaw('product_id, SUM(views) views, SUM(unique_viewers) unique_viewers, MAX(title) title, MAX(category_id) category_id, MAX(city_id) city_id, MAX(seller_id) seller_id')
            ->get()->keyBy('product_id');
        $prevViews = $this->productQuery('analytics_daily_product_views', $prevRange, $city, $category)
            ->groupBy('product_id')->selectRaw('product_id, SUM(views) views')->pluck('views', 'product_id');
        $sales = $this->productQuery('analytics_daily_product_sales', $range, $city, $category)
            ->groupBy('product_id')
            ->selectRaw('product_id, SUM(orders) orders, SUM(completed_orders) completed_orders, SUM(completed_revenue) completed_revenue, MAX(title) title, MAX(category_id) category_id, MAX(city_id) city_id, MAX(seller_id) seller_id')
            ->get()->keyBy('product_id');

        $sellerNames = DB::table('users')->whereIn('id', $views->pluck('seller_id')->merge($sales->pluck('seller_id'))->filter()->unique())->pluck('name', 'id');

        $row = function ($id) use ($views, $prevViews, $sales, $cityNames, $categoryNames, $sellerNames) {
            $v = $views[$id] ?? null;
            $s = $sales[$id] ?? null;
            $base = $v ?? $s;
            $cur = (int) ($v->views ?? 0);
            $prev = (int) ($prevViews[$id] ?? 0);
            $completed = (int) ($s->completed_orders ?? 0);

            return [
                'product_id' => (int) $id,
                'title' => $base->title ?? null,
                'category' => $categoryNames[$base->category_id ?? 0] ?? null,
                'city' => $cityNames[$base->city_id ?? 0] ?? null,
                'seller' => $sellerNames[$base->seller_id ?? 0] ?? null,
                'views' => $cur,
                'unique_viewers' => (int) ($v->unique_viewers ?? 0),
                'previous_views' => $prev,
                'views_change_pct' => $prev ? round(100 * ($cur - $prev) / $prev, 1) : null,
                'orders' => (int) ($s->orders ?? 0),
                'completed_orders' => $completed,
                'completed_revenue' => round((float) ($s->completed_revenue ?? 0), 2),
                'conversion_rate' => $cur ? round(100 * $completed / $cur, 2) : null,
            ];
        };

        $ids = $views->keys()->merge($sales->keys())->unique();
        $all = $ids->map($row);

        // Growth needs some volume to mean anything.
        $withHistory = $all->filter(fn ($p) => $p['previous_views'] >= 3 || $p['views'] >= 3);

        return [
            'most_viewed' => $all->sortByDesc('views')->filter(fn ($p) => $p['views'] > 0)->take(10)->values(),
            'best_selling' => $all->sortByDesc('completed_orders')->filter(fn ($p) => $p['completed_orders'] > 0)->take(10)->values(),
            'top_revenue' => $all->sortByDesc('completed_revenue')->filter(fn ($p) => $p['completed_revenue'] > 0)->take(10)->values(),
            'best_conversion' => $all->filter(fn ($p) => $p['views'] >= 10 && $p['completed_orders'] > 0)->sortByDesc('conversion_rate')->take(10)->values(),
            'rising' => $withHistory->filter(fn ($p) => $p['views'] > $p['previous_views'])
                ->sortByDesc(fn ($p) => $p['views'] - $p['previous_views'])->take(5)->values(),
            'declining' => $withHistory->filter(fn ($p) => $p['views'] < $p['previous_views'])
                ->sortBy(fn ($p) => $p['views'] - $p['previous_views'])->take(5)->values(),
        ];
    }

    /** Cities (category_id fixed to the filter or 0) or sections (city fixed to the filter or 0). */
    private function dimension(string $dim, array $range, array $prevRange, int $otherFilter, Collection $names): array
    {
        $other = $dim === 'city_id' ? 'category_id' : 'city_id';
        $q = fn (array $r) => DB::table('analytics_daily_market_stats')
            ->whereBetween('date', $r)->where($dim, '>', 0)->where($other, $otherFilter)
            ->groupBy($dim);

        $cur = $q($range)->selectRaw("$dim AS id, SUM(views) views, SUM(unique_viewers) unique_viewers, SUM(searches) searches,
            SUM(orders) orders, SUM(completed_orders) completed_orders, SUM(completed_revenue) completed_revenue, SUM(buyers) buyers")->get();
        $prev = $q($prevRange)->selectRaw("$dim AS id, SUM(views) views, SUM(completed_orders) completed_orders")->get()->keyBy('id');

        $rows = $cur->map(function ($r) use ($prev, $names) {
            $views = (int) $r->views;
            $completed = (int) $r->completed_orders;
            $pv = (int) ($prev[$r->id]->views ?? 0);

            return [
                'id' => (int) $r->id,
                'name' => $names[$r->id] ?? null,
                'views' => $views,
                'unique_viewers' => (int) $r->unique_viewers,
                'searches' => (int) $r->searches,
                'orders' => (int) $r->orders,
                'completed_orders' => $completed,
                'completed_revenue' => round((float) $r->completed_revenue, 2),
                'buyers' => (int) $r->buyers,
                'conversion_rate' => $views ? round(100 * $completed / $views, 2) : null,
                'previous_views' => $pv,
                'views_change_pct' => $pv ? round(100 * ($views - $pv) / $pv, 1) : null,
            ];
        })->sortByDesc('views')->values();

        // High demand, low conversion: above-median views, lowest conversion.
        $median = $rows->pluck('views')->sort()->values();
        $mid = $median->count() ? $median[intdiv($median->count(), 2)] : 0;
        $opportunities = $rows->filter(fn ($r) => $r['views'] >= max(1, $mid))
            ->sortBy(fn ($r) => $r['conversion_rate'] ?? 0)->take(5)->values();

        return ['rows' => $rows, 'high_demand_low_conversion' => $opportunities];
    }

    private function search(array $range, array $prevRange, int $city, int $category): array
    {
        $q = fn (array $r) => DB::table('analytics_daily_search_terms')->whereBetween('date', $r)
            ->where('city_id', $city)->where('category_id', $category)->groupBy('term');
        $prev = $q($prevRange)->selectRaw('term, SUM(searches) searches')->pluck('searches', 'term');
        $terms = $q($range)->selectRaw('term, SUM(searches) searches, SUM(zero_result_searches) zero_result_searches')->get()
            ->map(fn ($r) => [
                'term' => $r->term,
                'searches' => (int) $r->searches,
                'zero_result_searches' => (int) $r->zero_result_searches,
                'previous_searches' => (int) ($prev[$r->term] ?? 0),
            ]);

        return [
            'top_terms' => $terms->sortByDesc('searches')->take(15)->values(),
            'zero_result_terms' => $terms->filter(fn ($t) => $t['zero_result_searches'] > 0)->sortByDesc('zero_result_searches')->take(10)->values(),
        ];
    }

    /** Daily points for ranges up to ~2 months, monthly points beyond. */
    private function trend(array $range, int $days, int $city, int $category): array
    {
        $rows = $this->market($range, $city, $category)
            ->orderBy('date')
            ->get(['date', 'views', 'searches', 'completed_orders', 'completed_revenue']);
        $monthly = $days > 62;
        // Every day / month of the range, zeros included, so the time axis stays truthful.
        $points = [];
        for ($d = CarbonImmutable::parse($range[0]); $d->toDateString() <= $range[1]; $d = $monthly ? $d->addMonthNoOverflow()->startOfMonth() : $d->addDay()) {
            $key = $monthly ? $d->format('Y-m') : $d->toDateString();
            $points[$key] = ['period' => $key, 'views' => 0, 'searches' => 0, 'completed_orders' => 0, 'completed_revenue' => 0.0];
        }
        foreach ($rows as $r) {
            $key = $monthly ? substr((string) $r->date, 0, 7) : substr((string) $r->date, 0, 10);
            $points[$key] ??= ['period' => $key, 'views' => 0, 'searches' => 0, 'completed_orders' => 0, 'completed_revenue' => 0.0];
            $points[$key]['views'] += (int) $r->views;
            $points[$key]['searches'] += (int) $r->searches;
            $points[$key]['completed_orders'] += (int) $r->completed_orders;
            $points[$key]['completed_revenue'] = round($points[$key]['completed_revenue'] + (float) $r->completed_revenue, 2);
        }

        return ['granularity' => $monthly ? 'month' : 'day', 'points' => array_values($points)];
    }
}
