<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ChecksFinanceModules;
use App\Services\Finance\FinanceModuleSettings;
use App\Services\Finance\FinancialActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialActivityController extends Controller
{
    use ChecksFinanceModules;

    public function __construct(
        private readonly FinancialActivityService $activity,
        private readonly FinanceModuleSettings $financeModules,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($response = $this->ensureWallet($this->financeModules)) {
            return $response;
        }

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
