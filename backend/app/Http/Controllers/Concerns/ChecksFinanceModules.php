<?php

namespace App\Http\Controllers\Concerns;

use App\Services\Finance\FinanceModuleSettings;
use Illuminate\Http\JsonResponse;

trait ChecksFinanceModules
{
    protected function financeModuleDisabledResponse(): JsonResponse
    {
        return response()->json([
            'message' => __('finance.module_disabled'),
        ], 403);
    }

    protected function ensurePaymentsModule(FinanceModuleSettings $modules): ?JsonResponse
    {
        if (! $modules->isPaymentsModuleEnabled()) {
            return $this->financeModuleDisabledResponse();
        }

        return null;
    }

    protected function ensureWallet(FinanceModuleSettings $modules): ?JsonResponse
    {
        if (! $modules->canUseWallet()) {
            return $this->financeModuleDisabledResponse();
        }

        return null;
    }

    protected function ensureBankAccounts(FinanceModuleSettings $modules): ?JsonResponse
    {
        if (! $modules->canUseBankAccounts()) {
            return $this->financeModuleDisabledResponse();
        }

        return null;
    }

    protected function ensureFinancialGuarantee(FinanceModuleSettings $modules): ?JsonResponse
    {
        if (! $modules->canUseFinancialGuarantee()) {
            return $this->financeModuleDisabledResponse();
        }

        return null;
    }
}
