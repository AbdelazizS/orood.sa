<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductSimilarController extends Controller
{
    /**
     * Get similar products with smart matching logic.
     * Priority: 1) same subcategory 2) same category 3) same city 4) same type 5) price range.
     * Excludes current product and optionally same seller.
     */
    public function __invoke(Product $product): JsonResponse
    {
        if (!$product->category_id && !$product->city_id) {
            return response()->json(['data' => []]);
        }

        $query = Product::query()
            ->with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->withCount('bids')
            ->published()
            ->approved()
            ->where('id', '!=', $product->id)
            ->where('user_id', '!=', $product->user_id); // Exclude same seller

        $price = $product->price ? (float) $product->price : null;
        $priceTolerance = $price ? max(500, $price * 0.35) : null;

        // Build similar products with priority scoring
        $baseQuery = clone $query;

        $similar = collect();

        // 1. Same subcategory + same city (highest relevance)
        if ($product->subcategory_id && $product->city_id) {
            $subset = (clone $baseQuery)
                ->where('subcategory_id', $product->subcategory_id)
                ->where('city_id', $product->city_id)
                ->where('type', $product->type)
                ->orderByDesc('published_at')
                ->limit(12)
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        // 2. Same subcategory (any location)
        if ($similar->count() < 12 && $product->subcategory_id) {
            $subset = (clone $baseQuery)
                ->where('subcategory_id', $product->subcategory_id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->where('type', $product->type)
                ->orderByDesc('published_at')
                ->limit(12 - $similar->count())
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        // 3. Same category + same city
        if ($similar->count() < 12 && $product->category_id && $product->city_id) {
            $subset = (clone $baseQuery)
                ->where('category_id', $product->category_id)
                ->where('city_id', $product->city_id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->where('type', $product->type)
                ->orderByDesc('published_at')
                ->limit(12 - $similar->count())
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        // 4. Same category (any location)
        if ($similar->count() < 12 && $product->category_id) {
            $subset = (clone $baseQuery)
                ->where('category_id', $product->category_id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->where('type', $product->type)
                ->orderByDesc('published_at')
                ->limit(12 - $similar->count())
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        // 5. Same city (any category)
        if ($similar->count() < 12 && $product->city_id) {
            $subset = (clone $baseQuery)
                ->where('city_id', $product->city_id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->where('type', $product->type)
                ->orderByDesc('published_at')
                ->limit(12 - $similar->count())
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        // 6. Price range similarity (same category)
        if ($similar->count() < 12 && $product->category_id && $priceTolerance) {
            $subset = (clone $baseQuery)
                ->where('category_id', $product->category_id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->where('type', $product->type)
                ->whereBetween('price', [$price - $priceTolerance, $price + $priceTolerance])
                ->orderByDesc('published_at')
                ->limit(12 - $similar->count())
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        // 7. Fallback: same category only
        if ($similar->count() < 12 && $product->category_id) {
            $subset = (clone $baseQuery)
                ->where('category_id', $product->category_id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->orderByDesc('published_at')
                ->limit(12 - $similar->count())
                ->get();
            $similar = $similar->merge($subset)->unique('id');
        }

        $similar = $similar->take(12)->values();

        return response()->json([
            'data' => ProductResource::collection($similar),
        ]);
    }
}
