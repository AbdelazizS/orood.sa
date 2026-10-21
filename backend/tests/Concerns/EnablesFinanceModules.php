<?php

namespace Tests\Concerns;

use App\Services\Finance\FinanceModuleSettings;

/**
 * Finance modules are off by default since the production release; these flows are tested with them on.
 */
trait EnablesFinanceModules
{
    protected function enableFinanceModules(): void
    {
        FinanceModuleSettings::resetCache();
        app(FinanceModuleSettings::class)->update(array_fill_keys(array_keys(FinanceModuleSettings::defaults()), true));
        // Checkout options come from the payment_methods table (wallet_escrow, cod, direct_transfer…).
        $this->seed(\Database\Seeders\PaymentMethodSeeder::class);
        // Cash on delivery needs an enabled global COD policy (none exists in a fresh database).
        \App\Models\CodPolicy::query()->updateOrCreate(
            ['scope' => \App\Models\CodPolicy::SCOPE_GLOBAL, 'scope_id' => null],
            ['enabled' => true, 'buyer_must_accept' => true, 'seller_can_toggle' => true, 'priority' => 0],
        );
    }
}
