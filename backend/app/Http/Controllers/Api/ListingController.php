<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListingIndexRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductFeedService;
use Illuminate\Http\JsonResponse;

class ListingController extends Controller
{
    public function __construct(private ProductFeedService $productFeedService)
    {
    }

    public function index(ListingIndexRequest $request): JsonResponse
    {
        $filters = $request->validatedFilters();
        $perPage = (int) $request->input('per_page', 20);
        $paginator = $this->productFeedService->paginatedFeed($filters, $perPage);

        return response()->json([
            'data' => ProductResource::collection($paginator),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'has_more' => $paginator->hasMorePages(),
            ],
        ]);
    }

    public function show(Product $listing): JsonResponse
    {
        $user = request()->user();
        if (! $listing->isAccessibleBy($user)) {
            abort(404);
        }

        $listing->loadCount(['bids', 'comments'])
            ->load(['category', 'subcategory.category', 'region.cities', 'city', 'seller.city', 'seller.company', 'currentBidUser', 'realEstateDetail']);

        $isOwner = $user && $user->id === $listing->user_id;
        if ($listing->isPubliclyListed() && (! $user || ! $isOwner)) {
            $listing->increment('view_count');
            $listing->increment('today_view_count');
        }

        $listing->is_owner = $isOwner;
        $snapshot = $listing->bidSnapshot($user);
        $listing->can_view_bid_details = $snapshot['can_view_bid_details'];
        $listing->highest_bid = $snapshot['highest_bid'];
        $listing->lowest_bid = $snapshot['lowest_bid'];
        $listing->bids_count = $snapshot['bids_count'];
        $listing->current_bid_user_id = $snapshot['current_bid_user_id'];

        return response()->json([
            'data' => new ProductResource($listing),
        ]);
    }
}
