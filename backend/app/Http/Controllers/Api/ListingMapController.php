<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListingMapController extends Controller
{
    /**
     * Published listings with coordinates for map browse.
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
        ]);

        $perPage = (int) ($validated['per_page'] ?? 200);

        $query = Product::query()
            ->publiclyListed()
            ->where('is_wholesale', false)
            ->whereNotNull('location_lat')
            ->whereNotNull('location_lng')
            ->with(['category', 'city', 'realEstateDetail']);

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

        if (! empty($validated['purpose']) || ! empty($validated['property_type'])) {
            $query->whereHas('realEstateDetail', function ($q) use ($validated) {
                if (! empty($validated['purpose'])) {
                    $q->where('purpose', $validated['purpose']);
                }
                if (! empty($validated['property_type'])) {
                    $q->where('property_type', $validated['property_type']);
                }
            });
        }

        if (isset($validated['north'], $validated['south'], $validated['east'], $validated['west'])) {
            $north = (float) $validated['north'];
            $south = (float) $validated['south'];
            $east = (float) $validated['east'];
            $west = (float) $validated['west'];
            $query->whereBetween('location_lat', [min($south, $north), max($south, $north)])
                ->whereBetween('location_lng', [min($west, $east), max($west, $east)]);
        }

        $listings = $query->orderByDesc('published_at')->limit($perPage)->get();

        $markers = $listings->map(fn (Product $p) => [
            'id' => $p->id,
            'title' => $p->title,
            'price' => $p->price,
            'lat' => (float) $p->location_lat,
            'lng' => (float) $p->location_lng,
            'thumbnail' => $p->image_url ?? data_get($p->media, 'cover'),
            'url' => '/products/'.$p->id,
            'purpose' => $p->realEstateDetail?->purpose,
            'property_type' => $p->realEstateDetail?->property_type,
        ]);

        return response()->json([
            'data' => $markers,
            'meta' => ['count' => $markers->count()],
        ]);
    }
}
