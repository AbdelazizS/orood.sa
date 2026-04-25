<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageVisit;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductViewController extends Controller
{
    /**
     * Record a product view (increment counts, create PageVisit).
     */
    public function __invoke(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if (! $product->isAccessibleBy($user)) {
            abort(404);
        }

        $source = $request->input('source');
        $platform = $request->input('platform');

        if ($product->isPubliclyListed() && (! $user || $user->id !== $product->user_id)) {
            $product->increment('view_count');
            $product->increment('today_view_count');
            $product->increment('daily_view_count');

            PageVisit::create([
                'product_id' => $product->id,
                'profile_id' => $product->user_id,
                'visitor_id' => $user?->id,
                'ip_address' => $request->ip(),
                'source' => $source,
                'platform' => $platform,
            ]);
        }

        return response()->json(['message' => 'View recorded']);
    }
}
