<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\District;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * GET /districts?city_id= — districts (الأحياء) of a city for the search bar and the add-listing form:
 * the curated list plus any district already used by listings in that city.
 */
class DistrictController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city_id' => ['required', 'integer', 'exists:cities,id'],
        ]);
        $cityId = (int) $validated['city_id'];

        $names = Cache::remember("districts_city_{$cityId}", now()->addMinutes(10), function () use ($cityId) {
            $listed = District::query()
                ->where('city_id', $cityId)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->pluck('name');

            $used = Product::query()
                ->where('city_id', $cityId)
                ->whereNotNull('district')
                ->where('district', '!=', '')
                ->distinct()
                ->pluck('district')
                ->map(fn ($d) => trim((string) $d));

            return $listed->merge($used)->filter()->unique()->values()->all();
        });

        return response()->json(['data' => $names]);
    }
}
