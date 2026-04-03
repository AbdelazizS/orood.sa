<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductFeedService;
use Illuminate\Http\Request;

class FilterController extends Controller
{
    public function __construct(private ProductFeedService $productFeedService)
    {
    }

    public function __invoke(Request $request)
    {
        $type = $request->get('type');
        $stats = $this->productFeedService->filterStats();

        return response()->json([
            'data' => $type ? data_get($stats, str_replace('-', '_', $type), []) : $stats,
        ]);
    }
}
