<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Support\SupportCmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HelpPageController extends Controller
{
    public function __construct(private readonly SupportCmsService $cms) {}

    public function show(Request $request): JsonResponse
    {
        $pageKey = $request->query('page', 'dashboard_help');
        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';

        return response()->json([
            'data' => $this->cms->publicHelpPage($pageKey, $locale),
        ]);
    }
}
