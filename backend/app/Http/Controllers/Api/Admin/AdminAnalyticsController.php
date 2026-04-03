<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\City;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $dateFrom = $request->get('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->get('date_to', now()->format('Y-m-d'));
        $period = $request->get('period', 'month'); // week, month, year
        $categoryId = $request->get('category_id');
        $regionId = $request->get('region_id');

        $baseProducts = Product::published()->approved();
        if ($categoryId) {
            $baseProducts->where('category_id', $categoryId);
        }
        if ($regionId) {
            $baseProducts->where('region_id', $regionId);
        }

        $allProducts = (clone $baseProducts)->get();
        $mostViewed = $allProducts->sortByDesc(fn ($p) => data_get($p->stats, 'views', 0))->take(10)->values()->map(fn ($p) => ['id' => $p->id, 'title' => $p->title, 'stats' => $p->stats]);
        $mostSold = $allProducts->sortByDesc(fn ($p) => data_get($p->stats, 'purchases', 0))->take(10)->values()->map(fn ($p) => ['id' => $p->id, 'title' => $p->title, 'stats' => $p->stats]);
        $cheapest = (clone $baseProducts)->whereNotNull('price')->orderBy('price')->limit(10)->get(['id', 'title', 'price']);

        $totalProducts = Product::published()->approved()->count();
        $totalUsers = User::count();
        $offersCount = Product::published()->approved()->where('type', 'offer')->count();
        $requestsCount = Product::published()->approved()->where('type', 'request')->count();
        $activeUsers = User::whereHas('products')->orWhereHas('favorites')->count();
        $sellersCount = User::where('role', 'seller')->count();
        $completedOrders = (int) Product::published()->get()->sum(fn ($p) => data_get($p->stats, 'purchases', 0));

        // Use PHP collection groupBy for SQLite compatibility (avoids GROUP BY DATE issues)
        $productsInRange = (clone $baseProducts)
            ->whereBetween('created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->get(['created_at']);

        $productsByDay = $productsInRange
            ->filter(fn ($p) => $p->created_at)
            ->groupBy(fn ($p) => $p->created_at->format('Y-m-d'))
            ->map(fn ($items, $date) => ['date' => $date, 'count' => $items->count()])
            ->sortKeys()
            ->values();

        $usersInRange = User::whereBetween('created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->get(['created_at']);

        $usersByDay = $usersInRange
            ->filter(fn ($u) => $u->created_at)
            ->groupBy(fn ($u) => $u->created_at->format('Y-m-d'))
            ->map(fn ($items, $date) => ['date' => $date, 'count' => $items->count()])
            ->sortKeys()
            ->values();

        $offersInRange = Product::published()->approved()->where('type', 'offer')
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->when($regionId, fn ($q) => $q->where('region_id', $regionId))
            ->whereBetween('created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->get(['created_at']);
        $offersByDay = $offersInRange
            ->groupBy(fn ($p) => $p->created_at?->format('Y-m-d'))
            ->map(fn ($items, $date) => (object) ['date' => $date, 'count' => $items->count()])
            ->keyBy('date');

        $requestsInRange = Product::published()->approved()->where('type', 'request')
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->when($regionId, fn ($q) => $q->where('region_id', $regionId))
            ->whereBetween('created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->get(['created_at']);
        $requestsByDay = $requestsInRange
            ->groupBy(fn ($p) => $p->created_at?->format('Y-m-d'))
            ->map(fn ($items, $date) => (object) ['date' => $date, 'count' => $items->count()])
            ->keyBy('date');

        // Build full date range so charts always have data (even zeros)
        $start = \Carbon\Carbon::parse($dateFrom);
        $end = \Carbon\Carbon::parse($dateTo);
        $allDates = collect();
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $allDates->push($d->format('Y-m-d'));
        }
        $productsByDate = $productsByDay->keyBy('date');
        $usersByDate = $usersByDay->keyBy('date');
        $productsByDay = $allDates->map(fn ($date) => [
            'date' => $date,
            'count' => ($productsByDate->get($date) ?? [])['count'] ?? 0,
        ])->values();
        $usersByDay = $allDates->map(fn ($date) => [
            'date' => $date,
            'count' => ($usersByDate->get($date) ?? [])['count'] ?? 0,
        ])->values();
        $offersVsRequestsTrend = $allDates->map(fn ($date) => [
            'date' => $date,
            'offers' => $offersByDay->get($date)?->count ?? 0,
            'requests' => $requestsByDay->get($date)?->count ?? 0,
        ])->toArray();

        // Show ALL categories with product counts (including 0) for "أكثر الأقسام نشاطاً"
        $topCategories = Category::withCount(['products' => fn ($q) => $q->published()->approved()])
            ->orderBy('name')
            ->get()
            ->sortByDesc('products_count')
            ->values()
            ->map(fn ($c) => [
                'name' => $c->name,
                'name_ar' => $c->name_ar,
                'count' => $c->products_count,
            ]);

        $baseForRegions = Product::published()->approved()->when($categoryId, fn ($q) => $q->where('category_id', $categoryId));
        $regionalDistribution = Region::all()
            ->map(fn ($r) => [
                'name' => $r->name,
                'name_ar' => $r->name_ar,
                'count' => (clone $baseForRegions)->where('region_id', $r->id)->count(),
            ])
            ->filter(fn ($r) => $r['count'] > 0)
            ->sortByDesc('count')
            ->values();

        // Reports: top products/sellers/buyers/cities by period
        $range = $this->getDateRangeForPeriod($period);
        $reports = $this->buildReports($range['from']->format('Y-m-d'), $range['to']->format('Y-m-d'));

        return response()->json([
            'data' => [
                'most_viewed' => $mostViewed,
                'most_sold' => $mostSold,
                'cheapest' => $cheapest,
                'totals' => [
                    'products' => $totalProducts,
                    'users' => $totalUsers,
                    'offers' => $offersCount,
                    'requests' => $requestsCount,
                    'active_users' => $activeUsers,
                    'verified_sellers' => $sellersCount,
                    'completed_orders' => $completedOrders,
                ],
                'products_by_day' => $productsByDay,
                'users_by_day' => $usersByDay,
                'offers_vs_requests_trend' => $offersVsRequestsTrend,
                'top_categories' => $topCategories,
                'regional_distribution' => $regionalDistribution,
                'reports' => $reports,
                'filters' => [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'category_id' => $categoryId,
                'region_id' => $regionId,
                'period' => $period,
            ],
        ],
    ]);
    }

    private function getDateRangeForPeriod(string $period): array
    {
        $now = now();
        return match ($period) {
            'week' => ['from' => $now->copy()->subWeek(), 'to' => $now],
            'year' => ['from' => $now->copy()->subYear(), 'to' => $now],
            default => ['from' => $now->copy()->subMonth(), 'to' => $now],
        };
    }

    private function buildReports(string $dateFrom, string $dateTo): array
    {
        $from = \Carbon\Carbon::parse($dateFrom)->startOfDay()->format('Y-m-d H:i:s');
        $to = \Carbon\Carbon::parse($dateTo)->endOfDay()->format('Y-m-d H:i:s');

        // Top products by purchases (completed)
        $topProducts = Purchase::whereIn('status', [Purchase::STATUS_COMPLETED, Purchase::STATUS_DELIVERED, Purchase::STATUS_SHIPPED])
            ->whereBetween('created_at', [$from, $to])
            ->select('product_id', DB::raw('COUNT(*) as purchase_count'), DB::raw('SUM(amount) as total_amount'))
            ->groupBy('product_id')
            ->orderByDesc('purchase_count')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $product = Product::find($row->product_id);
                return [
                    'id' => $row->product_id,
                    'title' => $product?->title ?? '—',
                    'purchase_count' => (int) $row->purchase_count,
                    'total_amount' => (float) $row->total_amount,
                ];
            })
            ->values()
            ->toArray();

        // Top sellers
        $topSellers = Purchase::whereIn('status', [Purchase::STATUS_COMPLETED, Purchase::STATUS_DELIVERED, Purchase::STATUS_SHIPPED])
            ->whereBetween('created_at', [$from, $to])
            ->select('seller_id', DB::raw('COUNT(*) as order_count'), DB::raw('SUM(amount) as total_amount'))
            ->groupBy('seller_id')
            ->orderByDesc('order_count')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $user = User::find($row->seller_id);
                return [
                    'id' => $row->seller_id,
                    'name' => $user?->name ?? '—',
                    'email' => $user?->email ?? null,
                    'order_count' => (int) $row->order_count,
                    'total_amount' => (float) $row->total_amount,
                ];
            })
            ->values()
            ->toArray();

        // Top buyers
        $topBuyers = Purchase::whereIn('status', [Purchase::STATUS_COMPLETED, Purchase::STATUS_DELIVERED, Purchase::STATUS_SHIPPED])
            ->whereBetween('created_at', [$from, $to])
            ->select('buyer_id', DB::raw('COUNT(*) as order_count'), DB::raw('SUM(amount) as total_amount'))
            ->groupBy('buyer_id')
            ->orderByDesc('order_count')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $user = User::find($row->buyer_id);
                return [
                    'id' => $row->buyer_id,
                    'name' => $user?->name ?? '—',
                    'email' => $user?->email ?? null,
                    'order_count' => (int) $row->order_count,
                    'total_amount' => (float) $row->total_amount,
                ];
            })
            ->values()
            ->toArray();

        // Top cities by purchase count (from product city or shipping)
        $cityIds = Purchase::whereIn('purchases.status', [Purchase::STATUS_COMPLETED, Purchase::STATUS_DELIVERED, Purchase::STATUS_SHIPPED])
            ->whereBetween('purchases.created_at', [$from, $to])
            ->join('products', 'purchases.product_id', '=', 'products.id')
            ->whereNotNull('products.city_id')
            ->select('products.city_id', DB::raw('COUNT(*) as purchase_count'))
            ->groupBy('products.city_id')
            ->orderByDesc('purchase_count')
            ->limit(10)
            ->get();

        $topCities = $cityIds->map(function ($row) {
            $city = City::find($row->city_id);
            return [
                'id' => $row->city_id,
                'name' => $city?->name ?? '—',
                'purchase_count' => (int) $row->purchase_count,
            ];
        })->values()->toArray();

        return [
            'top_products' => $topProducts,
            'top_sellers' => $topSellers,
            'top_buyers' => $topBuyers,
            'top_cities' => $topCities,
            'period_from' => $dateFrom,
            'period_to' => $dateTo,
        ];
    }

    public function regions(Request $request): JsonResponse
    {
        $categoryId = $request->get('category_id');
        $baseForRegions = Product::published()->approved()->when($categoryId, fn ($q) => $q->where('category_id', $categoryId));
        $data = Region::all()
            ->map(fn ($r) => [
                'name' => $r->name,
                'name_ar' => $r->name_ar,
                'count' => (clone $baseForRegions)->where('region_id', $r->id)->count(),
            ])
            ->filter(fn ($r) => $r['count'] > 0)
            ->sortByDesc('count')
            ->values();
        return response()->json(['data' => $data]);
    }
}
