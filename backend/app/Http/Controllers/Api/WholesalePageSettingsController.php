<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AdminSettingsService;
use Illuminate\Http\JsonResponse;

class WholesalePageSettingsController extends Controller
{
    public function __invoke(AdminSettingsService $settings): JsonResponse
    {
        return response()->json([
            'data' => $settings->wholesaleMarketPage(),
        ]);
    }
}
