<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOverviewController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $categories = Category::withCount(['products' => fn ($q) => $q->published()->approved()])
            ->with(['subcategories' => fn ($q) => $q->withCount(['products' => fn ($pq) => $pq->published()->approved()])])
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'products_count' => $c->products_count,
                'subcategories' => $c->subcategories->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'products_count' => $s->products_count,
                ]),
            ]);

        $regions = Region::with(['cities' => fn ($q) => $q->withCount(['products' => fn ($pq) => $pq->published()->approved()])])
            ->orderBy('name')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'cities' => $r->cities->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'products_count' => $c->products_count,
                ]),
                'products_count' => Product::published()->approved()->where('region_id', $r->id)->count(),
            ]);

        $recentProducts = Product::with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->published()
            ->approved()
            ->orderByDesc('published_at')
            ->limit(20)
            ->get();

        $totals = [
            'products' => Product::published()->approved()->count(),
            'users' => User::count(),
            'offers' => Product::published()->approved()->where('type', 'offer')->count(),
            'requests' => Product::published()->approved()->where('type', 'request')->count(),
            'active_users' => User::whereHas('products')->orWhereHas('favorites')->count(),
            'verified_sellers' => User::where('role', 'seller')->count(),
            'completed_orders' => (int) Product::published()->get()->sum(fn ($p) => data_get($p->stats, 'purchases', 0)),
        ];

        return response()->json([
            'data' => [
                'categories' => $categories,
                'regions' => $regions,
                'recent_products' => ProductResource::collection($recentProducts),
                'totals' => $totals,
            ],
        ]);
    }
}
