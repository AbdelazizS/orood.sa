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
        $user = request()->user();
        if (! $product->isAccessibleBy($user)) {
            abort(404);
        }

        $product->loadCount(['bids', 'comments'])
            ->load(['category', 'subcategory', 'region.cities', 'city', 'seller.city', 'currentBidUser']);

        $isOwner = $user && $user->id === $product->user_id;

        if ($product->isPubliclyListed() && (! $user || ! $isOwner)) {
            $product->increment('view_count');
            $product->increment('today_view_count');
        }

        $product->is_owner = $isOwner;
        $snapshot = $product->bidSnapshot($user);
        $product->can_view_bid_details = $snapshot['can_view_bid_details'];
        $product->highest_bid = $snapshot['highest_bid'];
        $product->lowest_bid = $snapshot['lowest_bid'];
        $product->bids_count = $snapshot['bids_count'];
        $product->current_bid_user_id = $snapshot['current_bid_user_id'];

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }
}
