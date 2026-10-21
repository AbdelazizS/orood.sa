<?php

namespace App\Http\Controllers\Api\Subscriber;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\SubscriberListingResource;
use App\Models\Product;
use App\Models\SubscriberListing;
use App\Services\Subscribers\SubscriberAdLifecycleService;
use App\Services\Subscribers\SubscriberAdPurchaseService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Subscriber area (role:subscriber): listings awaiting a marketer, buying their ad, and the subscriber's bought listings.
 */
class SubscriberController extends Controller
{
    private const PRODUCT_RELATIONS = ['category', 'subcategory', 'region', 'city', 'seller', 'realEstateDetail'];

    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'credits_balance' => $user->adCreditsBalance(),
            'bought_count' => $user->subscriberListings()->count(),
            'available_count' => Product::query()->publiclyVisibleAwaiting()->count(),
            'unread_total' => SubscriberListing::unreadTotalFor((int) $user->id, (int) $user->id),
        ]]);
    }

    /** Listings awaiting a marketer, with full details (price, contact) for the subscriber. */
    public function available(Request $request): JsonResponse
    {
        $validated = $this->validateFilters($request);

        $paginator = $this->filtered(Product::query()->publiclyVisibleAwaiting(), $validated)
            ->with(self::PRODUCT_RELATIONS)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json([
            'data' => ProductResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /** Same listings as map pins (the subscriber sees the price). */
    public function availableMap(Request $request): JsonResponse
    {
        $validated = $this->validateFilters($request);

        $listings = $this->filtered(Product::query()->publiclyVisibleAwaiting(), $validated)
            ->whereNotNull('location_lat')
            ->whereNotNull('location_lng')
            ->with(['city', 'realEstateDetail'])
            ->orderByDesc('published_at')
            ->limit(500)
            ->get();

        $locale = $request->header('Accept-Language');
        $markers = $listings->map(fn (Product $p) => [
            'id' => $p->id,
            'title' => $p->title,
            'price' => $p->price,
            'lat' => (float) $p->location_lat,
            'lng' => (float) $p->location_lng,
            'thumbnail' => $p->image_url ?? data_get($p->media, 'cover'),
            'url' => '/subscriber/listings/'.$p->id,
            'purpose' => $p->realEstateDetail?->purpose,
            'property_type' => $p->realEstateDetail?->property_type,
            'marketing_status' => $p->marketing_status,
            'district' => $p->district,
            'street_width' => $p->realEstateDetail?->street_width_m,
            'city' => $p->city?->getLocalizedName($locale),
        ]);

        return response()->json(['data' => $markers, 'meta' => ['count' => $markers->count()]]);
    }

    /** Full details of an awaiting listing, or of a listing this subscriber already bought. */
    public function show(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        // This subscriber's latest ad on the listing that is not expired (expired ads can be bought again).
        $owned = SubscriberListing::query()
            ->where('product_id', $product->id)
            ->where('subscriber_id', $user->id)
            ->where('status', '!=', SubscriberListing::STATUS_EXPIRED)
            ->latest('id')
            ->first();

        if (! $owned && ! $product->isPubliclyVisibleAwaiting()) {
            abort(404);
        }

        $product->loadCount(['bids', 'comments'])->load(self::PRODUCT_RELATIONS);

        return response()->json([
            'data' => new ProductResource($product),
            'meta' => [
                'can_buy' => ! $owned && $product->isPubliclyVisibleAwaiting(),
                'subscriber_listing_id' => $owned?->id,
                'purchased_at' => $owned?->purchased_at,
                'ad_status' => $owned?->status,
                'expires_at' => $owned?->expires_at,
                'days_left' => $owned?->status === SubscriberListing::STATUS_ACTIVE && $owned?->expires_at
                    ? max(0, (int) ceil(now()->diffInHours($owned->expires_at, false) / 24))
                    : null,
                'end_reason' => $owned?->end_reason,
                'ad_days' => (int) config('subscribers.ad_days'),
                'credits_balance' => $user->adCreditsBalance(),
            ],
        ]);
    }

    public function buy(Request $request, Product $product, SubscriberAdPurchaseService $service): JsonResponse
    {
        $row = $service->buy($request->user(), $product);

        return response()->json([
            'message' => 'تم شراء الإعلان، وأصبح العقار معروضاً بالسعر.',
            'data' => [
                'subscriber_listing_id' => $row->id,
                'product_id' => $row->product_id,
                'credits_balance' => $request->user()->adCreditsBalance(),
            ],
        ], 201);
    }

    /** The subscriber marks a property they marketed as sold. */
    public function markSold(Request $request, SubscriberListing $subscriberListing, SubscriberAdLifecycleService $lifecycle): JsonResponse
    {
        abort_unless((int) $subscriberListing->subscriber_id === (int) $request->user()->id, 403);
        $row = $lifecycle->markSold($subscriberListing, $request->user());

        return response()->json(['data' => ['status' => $row->status]]);
    }

    /** The subscriber's bought listings; listings with the newest note come first. */
    public function myListings(Request $request): JsonResponse
    {
        $validated = $this->validateFilters($request);

        $query = SubscriberListing::query()
            ->where('subscriber_id', $request->user()->id)
            ->when(in_array($request->query('status'), ['active', 'expired', 'cancelled', 'sold'], true), fn ($q) => $q->where('status', $request->query('status')))
            ->whereHas('product', fn ($q) => $this->filtered($q, $validated))
            ->with(['product' => fn ($q) => $q->with(self::PRODUCT_RELATIONS)])
            ->withCount('notes');
        SubscriberListing::withUnreadCountFor($query, (int) $request->user()->id);

        $paginator = self::orderByActivity($query)->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json([
            'data' => SubscriberListingResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'unread_total' => SubscriberListing::unreadTotalFor((int) $request->user()->id, (int) $request->user()->id),
            ],
        ]);
    }

    /** Newest note first, then newest purchase (portable across SQLite and MySQL). */
    public static function orderByActivity(Builder $query): Builder
    {
        return $query
            ->orderByRaw('CASE WHEN last_note_at IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('last_note_at')
            ->orderByDesc('purchased_at')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateFilters(Request $request): array
    {
        return $request->validate([
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'property_type' => ['nullable', 'string', 'in:apartment,villa,land,building,floor,shop,farm'],
            'purpose' => ['nullable', 'string', 'in:sale,rent'],
            'district' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function filtered(Builder $query, array $filters): Builder
    {
        if (! empty($filters['city_id'])) {
            $query->where('city_id', $filters['city_id']);
        }
        if (! empty($filters['district'])) {
            $query->where('district', trim($filters['district']));
        }
        if (! empty($filters['property_type']) || ! empty($filters['purpose'])) {
            $query->whereHas('realEstateDetail', function ($q) use ($filters) {
                if (! empty($filters['property_type'])) {
                    $q->where('property_type', $filters['property_type']);
                }
                if (! empty($filters['purpose'])) {
                    $q->where('purpose', $filters['purpose']);
                }
            });
        }

        return $query;
    }
}
