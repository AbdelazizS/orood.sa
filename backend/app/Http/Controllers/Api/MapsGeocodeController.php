<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Maps\NominatimGeocodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapsGeocodeController extends Controller
{
    public function __construct(
        protected NominatimGeocodeService $geocode
    ) {}

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'lang' => ['sometimes', 'string', 'max:5'],
        ]);

        $lang = $validated['lang'] ?? $request->getPreferredLanguage(['ar', 'en']) ?? 'ar';

        $results = $this->geocode->search($validated['q'], $lang);

        return response()->json(['data' => $results]);
    }

    public function reverse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'lang' => ['sometimes', 'string', 'max:5'],
        ]);

        $lang = $validated['lang'] ?? $request->getPreferredLanguage(['ar', 'en']) ?? 'ar';

        $detail = $this->geocode->reverse(
            (float) $validated['lat'],
            (float) $validated['lng'],
            $lang
        );

        return response()->json(['data' => $detail]);
    }
}
