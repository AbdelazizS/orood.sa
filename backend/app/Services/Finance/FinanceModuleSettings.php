<?php

namespace App\Services\Finance;

use App\Models\AppSetting;

class FinanceModuleSettings
{
    public const KEY = 'finance.modules';

    /** @var array<string, bool>|null */
    private static ?array $cached = null;

    /**
     * @return array<string, bool>
     */
    public static function defaults(): array
    {
        return [
            'payments_module' => false,
            'escrow' => false,
            'financial_guarantee' => false,
            'bank_accounts' => false,
            'cod' => false,
            'wallet' => false,
        ];
    }

    /**
     * @return array<string, bool>
     */
    public function all(): array
    {
        if (self::$cached !== null) {
            return self::$cached;
        }

        $stored = AppSetting::getValue(self::KEY, []);
        if (! is_array($stored)) {
            $stored = [];
        }

        self::$cached = array_merge(self::defaults(), array_intersect_key(
            array_map(fn ($v) => (bool) $v, $stored),
            self::defaults()
        ));

        return self::$cached;
    }

    /**
     * @param  array<string, bool>  $modules
     * @return array<string, bool>
     */
    public function update(array $modules, ?int $updatedBy = null): array
    {
        $merged = $this->all();

        foreach (self::defaults() as $key => $default) {
            if (array_key_exists($key, $modules)) {
                $merged[$key] = (bool) $modules[$key];
            }
        }

        AppSetting::putValue(self::KEY, $merged, $updatedBy);
        self::$cached = $merged;

        return $merged;
    }

    public function isPaymentsModuleEnabled(): bool
    {
        return $this->all()['payments_module'];
    }

    public function canUseWallet(): bool
    {
        $modules = $this->all();

        return $modules['payments_module'] && $modules['wallet'];
    }

    public function canUseBankAccounts(): bool
    {
        $modules = $this->all();

        return $modules['payments_module'] && $modules['bank_accounts'];
    }

    public function canUseEscrow(): bool
    {
        $modules = $this->all();

        return $modules['payments_module'] && $modules['escrow'];
    }

    public function canUseCod(): bool
    {
        $modules = $this->all();

        return $modules['payments_module'] && $modules['cod'];
    }

    public function canUseFinancialGuarantee(): bool
    {
        $modules = $this->all();

        return $modules['payments_module'] && $modules['financial_guarantee'];
    }

    public function requiresPayoutSetupForListings(): bool
    {
        if (! $this->isPaymentsModuleEnabled()) {
            return false;
        }

        return $this->canUseBankAccounts();
    }

    public static function resetCache(): void
    {
        self::$cached = null;
    }
}
