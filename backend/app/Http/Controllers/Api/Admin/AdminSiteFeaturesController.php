<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\SiteFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSiteFeaturesController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => SiteFeatures::all()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'show_wholesale_button' => ['sometimes', 'boolean'],
        ]);

        return response()->json(['data' => SiteFeatures::update($validated, $request->user()?->id)]);
    }
}
