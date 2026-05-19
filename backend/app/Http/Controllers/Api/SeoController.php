<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Seo\SeoSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeoController extends Controller
{
    public function __construct(
        private readonly SeoSettingsService $seo
    ) {}

    public function resolve(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'path' => ['required', 'string', 'max:500'],
            'lang' => ['sometimes', 'string', 'max:5'],
        ]);

        $lang = $validated['lang'] ?? 'ar';
        $context = $request->only(['title', 'description', 'image', 'page_key', 'og_type']);

        return response()->json([
            'data' => $this->seo->resolveForPath($validated['path'], $lang, $context),
        ]);
    }
}
