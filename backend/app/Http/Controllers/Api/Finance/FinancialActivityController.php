<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Services\Finance\FinancialActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialActivityController extends Controller
{
    public function __construct(private readonly FinancialActivityService $activity) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->activity->timeline($request->user(), [
            'status' => $request->query('status'),
            'type' => $request->query('type'),
            'activity_type' => $request->query('activity_type'),
            'page' => $request->query('page', 1),
        ]);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
