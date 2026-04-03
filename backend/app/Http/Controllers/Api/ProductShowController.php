<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductShowController extends Controller
{
    public function __invoke(Product $product): JsonResponse
    {
        $product->loadCount(['bids', 'comments'])
            ->load(['category', 'subcategory', 'region.cities', 'city', 'seller.city', 'currentBidUser']);

        $user = request()->user();
        $isOwner = $user && $user->id === $product->user_id;

        if (!$user || !$isOwner) {
            $product->increment('view_count');
            $product->increment('today_view_count');
        }

        $product->highest_bid = $product->bids()->max('amount');
        $product->is_owner = $isOwner;

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }
}
