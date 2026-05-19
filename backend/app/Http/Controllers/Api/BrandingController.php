<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BrandingSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandingController extends Controller
{
    public function __construct(
        private readonly BrandingSettingsService $branding
    ) {}

    public function show(Request $request): JsonResponse
    {
        $locale = $request->header('Accept-Language', 'ar');
        $locale = str_starts_with(strtolower($locale), 'en') ? 'en' : 'ar';

        return response()->json([
            'data' => $this->branding->publicPayload($locale),
        ]);
    }
}
