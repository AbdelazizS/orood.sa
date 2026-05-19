<?php

namespace App\Services\Finance;

use App\Models\CodPolicy;
use App\Models\PaymentMethod;

class SellerPayoutCapabilities
{
    public function __construct(
        private readonly PaymentMethodService $paymentMethods,
    ) {}

    /**
     * @return array{
     *   platform_wallet_available: bool,
     *   direct_bank_available: bool,
     *   cod_available: bool,
     *   cod_seller_can_toggle: bool
     * }
     */
    public function forSeller(): array
    {
        $direct = $this->paymentMethods->getByCode(PaymentMethod::CODE_DIRECT_TRANSFER);
        $globalCod = CodPolicy::query()
            ->where('scope', CodPolicy::SCOPE_GLOBAL)
            ->whereNull('scope_id')
            ->orderByDesc('priority')
            ->first();

        return [
            'platform_wallet_available' => true,
            'direct_bank_available' => $direct !== null && (bool) $direct->enabled,
            'cod_available' => (bool) ($globalCod?->enabled ?? false),
            'cod_seller_can_toggle' => (bool) ($globalCod?->seller_can_toggle ?? true),
        ];
    }
}
