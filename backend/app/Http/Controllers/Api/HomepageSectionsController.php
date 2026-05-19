<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ListingCardResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class HomepageSectionsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $base = Product::query()->published()->approved()->where('is_wholesale', false);

        $latestOffers = (clone $base)->where('type', 'offer')->orderByDesc('published_at')->limit(8)->get();
        $latestRequests = (clone $base)->where('type', 'request')->orderByDesc('published_at')->limit(8)->get();
        $mostViewed = (clone $base)->orderByDesc('view_count')->limit(8)->get();
        $cheapest = (clone $base)->whereNotNull('price')->orderBy('price')->limit(8)->get();
        $topSold = (clone $base)->orderByDesc('sold_count')->limit(8)->get();
        $onlineNow = (clone $base)->where('contact_preferences->online', true)->limit(8)->get();

        return response()->json([
            'data' => [
                'latest_offers' => ListingCardResource::collection($latestOffers),
                'latest_requests' => ListingCardResource::collection($latestRequests),
                'most_viewed' => ListingCardResource::collection($mostViewed),
                'cheapest' => ListingCardResource::collection($cheapest),
                'top_sold' => ListingCardResource::collection($topSold),
                'online_now' => ListingCardResource::collection($onlineNow),
            ],
        ]);
    }
}
