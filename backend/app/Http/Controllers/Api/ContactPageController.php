<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AdminSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactPageController extends Controller
{
    public function __construct(private readonly AdminSettingsService $settings) {}

    public function show(Request $request): JsonResponse
    {
        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';

        return response()->json([
            'data' => $this->settings->contactPagePublic($locale),
        ]);
    }
}
