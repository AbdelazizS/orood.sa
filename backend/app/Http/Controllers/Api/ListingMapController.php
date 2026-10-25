<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ListingMapController extends Controller
{
    /**
     * Published listings (plus listings awaiting a marketer) with coordinates for map browse.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'north' => ['nullable', 'numeric', 'between:-90,90'],
            'south' => ['nullable', 'numeric', 'between:-90,90'],
            'east' => ['nullable', 'numeric', 'between:-180,180'],
            'west' => ['nullable', 'numeric', 'between:-180,180'],
            'purpose' => ['nullable', 'string', 'in:sale,rent'],
            'property_type' => ['nullable', 'string', 'in:apartment,villa,land,building,floor,shop,farm'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'real_estate_only' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'district' => ['nullable', 'string', 'max:120'],
            'street_width_min' => ['nullable', 'numeric', 'min:0'],
            'include_awaiting' => ['nullable', 'boolean'],
            'user_id' => ['nullable', 'integer'],
            // Video map (فيديوهات على الخارطة): only listings with a published video.
            'has_video' => ['nullable', 'boolean'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 200);
        $hasPriceFilter = isset($validated['min_price']) || isset($validated['max_price']);
        // Awaiting listings have no visible price, so a price filter leaves them out.
        $includeAwaiting = $request->boolean('include_awaiting', true) && ! $hasPriceFilter;

        $query = Product::query()
            ->where(function ($q) use ($includeAwaiting) {
                $q->where(fn ($listed) => $listed->publiclyListed()
                    ->where(fn ($m) => $m->whereNull('marketing_status')
                        ->orWhere('marketing_status', '!=', Product::MARKETING_AWAITING)));
                if ($includeAwaiting) {
                    $q->orWhere(fn ($awaiting) => $awaiting->publiclyVisibleAwaiting());
                }
            })
            ->where('is_wholesale', false)
            // map_lat/lng = exact location, else district centre, else city centre (all sections can be mapped).
            ->whereNotNull('map_lat')
            ->whereNotNull('map_lng')
            ->with(['category', 'city', 'realEstateDetail', 'latestVideo']);

        if ($request->boolean('has_video')) {
            $query->whereHas('videos', fn ($v) => $v->published());
        }

        if ($request->boolean('real_estate_only')) {
            $slugs = config('listings.real_estate_category_slugs', ['real-estate']);
            $query->whereHas('category', fn ($q) => $q->whereIn('slug', $slugs));
        }

        if (! empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (! empty($validated['city_id'])) {
            $query->where('city_id', $validated['city_id']);
        }

        if (! empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }

        if (! empty($validated['district'])) {
            $query->where('district', trim($validated['district']));
        }

        if (isset($validated['min_price'])) {
            $query->where('price', '>=', (float) $validated['min_price']);
        }

        if (isset($validated['max_price'])) {
            $query->where('price', '<=', (float) $validated['max_price']);
        }

        if (! empty($validated['purpose']) || ! empty($validated['property_type']) || isset($validated['street_width_min'])) {
            $query->whereHas('realEstateDetail', function ($q) use ($validated) {
                if (! empty($validated['purpose'])) {
                    $q->where('purpose', $validated['purpose']);
                }
                if (! empty($validated['property_type'])) {
                    $q->where('property_type', $validated['property_type']);
                }
                if (isset($validated['street_width_min'])) {
                    $q->where('street_width_m', '>=', (float) $validated['street_width_min']);
                }
            });
        }

        if (isset($validated['north'], $validated['south'], $validated['east'], $validated['west'])) {
            $north = (float) $validated['north'];
            $south = (float) $validated['south'];
            $east = (float) $validated['east'];
            $west = (float) $validated['west'];
            $query->whereBetween('map_lat', [min($south, $north), max($south, $north)])
                ->whereBetween('map_lng', [min($west, $east), max($west, $east)]);
        }

        $listings = $query->orderByDesc('published_at')->orderByDesc('id')->limit($perPage)->get();
        $viewer = $request->user();

        $markers = $listings->map(fn (Product $p) => [
            'id' => $p->id,
            'title' => $p->title,
            // Never leak the price of a listing that is still waiting for a marketer.
            'price' => $p->hidesPriceFrom($viewer) ? null : $p->price,
            'lat' => (float) $p->map_lat,
            'lng' => (float) $p->map_lng,
            // false when the pin sits on a district/city centre rather than the exact spot.
            'exact_location' => $p->location_lat !== null && $p->location_lng !== null,
            'thumbnail' => $p->image_url ?? data_get($p->media, 'cover'),
            'url' => '/products/'.$p->id,
            'purpose' => $p->realEstateDetail?->purpose,
            'property_type' => $p->realEstateDetail?->property_type,
            'marketing_status' => $p->marketing_status,
            'district' => $p->district,
            'street_width' => $p->realEstateDetail?->street_width_m,
            'city' => $p->city?->getLocalizedName($request->header('Accept-Language')),
            'category' => $p->category?->slug,
            'price_per_meter' => $p->price_per_meter !== null ? (float) $p->price_per_meter : null,
            'map_display' => $p->map_display ?? 'price',
            'video' => $p->latestVideo ? [
                'id' => $p->latestVideo->id,
                'thumbnail_url' => $p->latestVideo->thumbnail_url ?? ($p->image_url ?? data_get($p->media, 'cover')),
                'url' => $p->latestVideo->playbackUrl(),
                'is_short' => (bool) $p->latestVideo->is_short,
                'duration_sec' => $p->latestVideo->duration_sec,
            ] : null,
        ]);

        return response()->json([
            'data' => $markers,
            'meta' => ['count' => $markers->count()],
        ]);
    }

    /**
     * Distinct districts (الأحياء) already used by map-visible listings in a city.
     */
    public function districts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city_id' => ['required', 'integer', 'exists:cities,id'],
        ]);

        $cityId = (int) $validated['city_id'];

        $districts = Cache::remember("listings_map_districts_{$cityId}", now()->addMinutes(10), function () use ($cityId) {
            return Product::query()
                ->where('city_id', $cityId)
                ->where(fn ($q) => $q->publiclyListed()->orWhere(fn ($a) => $a->publiclyVisibleAwaiting()))
                ->whereNotNull('district')
                ->where('district', '!=', '')
                ->distinct()
                ->orderBy('district')
                ->pluck('district')
                ->map(fn ($d) => trim((string) $d))
                ->filter()
                ->unique()
                ->values()
                ->all();
        });

        return response()->json(['data' => $districts]);
    }
}
