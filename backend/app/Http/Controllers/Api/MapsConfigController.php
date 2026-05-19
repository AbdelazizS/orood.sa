<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class MapsConfigController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $token = trim((string) config('maps.mapbox_public_token', ''));
        $engine = strtolower(trim((string) config('maps.engine', '')));

        return response()->json([
            'data' => [
                'engine' => in_array($engine, ['manfith', 'mapbox', 'legacy', 'osm'], true) ? $engine : null,
                'mapbox_public_token' => $token !== '' ? $token : null,
                'style_id' => config('maps.style_id') ?: null,
                'default_center' => [
                    'lat' => config('maps.default_lat'),
                    'lng' => config('maps.default_lng'),
                ],
            ],
        ]);
    }
}
