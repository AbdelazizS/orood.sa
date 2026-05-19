<?php

namespace App\Support;

use App\Models\PaymentMethod;

class WalletBankTransferInstructions
{
    public static function resolve(?string $locale = null): array
    {
        $method = PaymentMethod::query()
            ->where('code', PaymentMethod::CODE_BANK_TRANSFER)
            ->first();

        $locale = $locale === 'en' ? 'en' : 'ar';
        $instructions = $method?->instructions[$locale] ?? $method?->instructions['ar'] ?? [];

        return [
            'account_name' => $instructions['account_name'] ?? config('finance.bank_transfer.account_name'),
            'bank_name' => $instructions['bank_name'] ?? config('finance.bank_transfer.bank_name'),
            'iban' => $instructions['iban'] ?? config('finance.bank_transfer.iban'),
            'intro' => $instructions['intro'] ?? null,
            'steps' => $instructions['steps'] ?? [],
        ];
    }
}
