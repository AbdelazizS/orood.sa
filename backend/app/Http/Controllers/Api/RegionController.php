<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RegionResource;
use App\Http\Resources\CityResource;
use App\Models\Region;

class RegionController extends Controller
{
    public function index()
    {
        $regions = cache()->remember('api.regions', now()->addMinutes(30), function () {
            return Region::with(['cities' => fn ($q) => $q->where('is_active', true)])
                ->where('is_active', true)
                ->get();
        });

        return RegionResource::collection($regions);
    }

    public function cities(Region $region)
    {
        $region->load(['cities' => fn ($q) => $q->where('is_active', true)]);

        return CityResource::collection($region->cities);
    }
}
