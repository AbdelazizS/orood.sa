<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Services\Finance\FinanceModuleSettings;
use Illuminate\Http\JsonResponse;

class FinanceModuleController extends Controller
{
    public function __construct(private readonly FinanceModuleSettings $modules) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->modules->all(),
        ]);
    }
}
