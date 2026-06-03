<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ChecksFinanceModules;
use App\Models\SellerPayoutProfile;
use App\Services\Finance\FinanceModuleSettings;
use App\Services\Finance\PaymentEligibilityEngine;
use App\Services\Finance\PaymentMethodService;
use App\Services\Finance\SellerPayoutCapabilities;
use App\Services\Finance\SellerPayoutProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class SellerPayoutProfileController extends Controller
{
    use ChecksFinanceModules;

    public function __construct(
        private readonly SellerPayoutProfileService $profiles,
        private readonly PaymentEligibilityEngine $eligibility,
        private readonly PaymentMethodService $paymentMethods,
        private readonly SellerPayoutCapabilities $capabilities,
        private readonly FinanceModuleSettings $financeModules,
    ) {}

    public function show(Request $request): JsonResponse
    {
        if ($response = $this->ensureBankAccounts($this->financeModules)) {
            return $response;
        }

        $user = $request->user();
        $profile = $this->profiles->getOrCreate($user);
        $setup = $this->eligibility->sellerSetupStatus($user);
        $caps = $this->capabilities->forSeller();

        $direct = $this->paymentMethods->getByCode('direct_transfer');
        $fields = $direct
            ? $this->paymentMethods->fieldsForContext($direct, 'payout_profile')
            : collect();

        $values = $profile->relationLoaded('values')
            ? $profile->values
            : $profile->load('values')->values;

        $fieldMap = $values->pluck('value_text', 'field_key')->all();

        return response()->json([
            'data' => [
                'profile' => $profile,
                'setup' => $setup,
                'capabilities' => $caps,
                'finance_modules' => $this->financeModules->all(),
                'accept_cod' => (bool) $profile->accept_cod,
                'enable_direct_bank' => $profile->primary_mode === SellerPayoutProfile::MODE_DIRECT_BANK,
                'field_definitions' => $fields->map(fn ($f) => [
                    'field_key' => $f->field_key,
                    'field_type' => $f->field_type,
                    'label' => $f->localizedLabel(),
                    'required' => $f->required,
                    'options' => $f->options,
                ]),
                'field_values' => $fieldMap,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if ($response = $this->ensureBankAccounts($this->financeModules)) {
            return $response;
        }

        $validated = $request->validate([
            'enable_direct_bank' => ['required', 'boolean'],
            'accept_cod' => ['nullable', 'boolean'],
            'fields' => ['nullable', 'array'],
        ]);

        try {
            $profile = $this->profiles->save($request->user(), $validated);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => __('finance.payout_saved'),
            'data' => [
                'profile' => $profile,
                'setup' => $this->eligibility->sellerSetupStatus($request->user()),
                'capabilities' => $this->capabilities->forSeller(),
                'accept_cod' => (bool) $profile->accept_cod,
                'enable_direct_bank' => $profile->primary_mode === SellerPayoutProfile::MODE_DIRECT_BANK,
            ],
        ]);
    }

    public function setupStatus(Request $request): JsonResponse
    {
        return response()->json([
            'data' => array_merge(
                $this->eligibility->sellerSetupStatus($request->user()),
                ['finance_modules' => $this->financeModules->all()],
            ),
        ]);
    }
}
