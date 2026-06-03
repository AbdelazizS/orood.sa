<?php

namespace App\Services\Finance;

use App\Models\Product;
use App\Models\SellerPayoutProfile;
use App\Models\User;

class PaymentEligibilityEngine
{
    public function __construct(
        private readonly PaymentMethodService $paymentMethods,
        private readonly CodPolicyEngine $codPolicy,
        private readonly FinanceModuleSettings $financeModules,
    ) {}

    /**
     * @return array{
     *   payout_ready: bool,
     *   payout_status: string,
     *   primary_mode: ?string,
     *   missing_fields: list<string>,
     *   can_activate_listings: bool,
     *   announcement_key: ?string,
     *   announcement_params: array<string, mixed>
     * }
     */
    public function sellerSetupStatus(User $user): array
    {
        if (! $this->financeModules->requiresPayoutSetupForListings()) {
            return [
                'payout_ready' => true,
                'payout_status' => SellerPayoutProfile::STATUS_VERIFIED,
                'primary_mode' => null,
                'missing_fields' => [],
                'can_activate_listings' => true,
                'wallet_only_sufficient' => true,
                'announcement_key' => null,
                'announcement_params' => [],
            ];
        }

        $profile = $user->sellerPayoutProfile;

        if (! $profile) {
            return [
                'payout_ready' => false,
                'payout_status' => SellerPayoutProfile::STATUS_INCOMPLETE,
                'primary_mode' => null,
                'missing_fields' => ['payout_setup'],
                'can_activate_listings' => false,
                'wallet_only_sufficient' => true,
                'announcement_key' => 'finance.walletOnlySaveHint',
                'announcement_params' => [],
            ];
        }

        $ready = $profile->status === SellerPayoutProfile::STATUS_VERIFIED;

        $announcementKey = null;
        if (! $ready) {
            $announcementKey = match ($profile->status) {
                SellerPayoutProfile::STATUS_PENDING_REVIEW => 'finance.directBankPendingOrUseWallet',
                SellerPayoutProfile::STATUS_REJECTED => 'finance.payoutProfileRejectedHint',
                default => 'finance.walletOnlySaveHint',
            };
        }

        return [
            'payout_ready' => $ready,
            'payout_status' => $profile->status,
            'primary_mode' => $profile->primary_mode,
            'missing_fields' => $ready ? [] : ['verification'],
            'can_activate_listings' => $ready,
            'wallet_only_sufficient' => true,
            'announcement_key' => $announcementKey,
            'announcement_params' => [],
        ];
    }

    public function resolveListingActivationStatus(User $seller, bool $autoPublish): string
    {
        if (! $this->financeModules->requiresPayoutSetupForListings()) {
            return 'active';
        }

        $setup = $this->sellerSetupStatus($seller);

        if ($setup['can_activate_listings']) {
            return 'active';
        }

        return 'pending_payout_setup';
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function checkoutPaymentOptions(Product $product, ?User $buyer): array
    {
        if (! $this->financeModules->isPaymentsModuleEnabled()) {
            return [];
        }

        $seller = $product->seller;
        $options = [];

        if ($this->financeModules->canUseEscrow()) {
            $wallet = $this->paymentMethods->getByCode('wallet_escrow');
            if ($wallet) {
                $options[] = $this->methodPayload($wallet, 'escrow');
            }
        }

        if ($this->financeModules->canUseCod()) {
            $codEval = $this->codPolicy->evaluate($product, $buyer, $seller);
            if ($codEval['allowed']) {
                $cod = $this->paymentMethods->getByCode('cod');
                if ($cod) {
                    $options[] = array_merge($this->methodPayload($cod, 'cod'), [
                        'buyer_must_accept' => $codEval['buyer_must_accept'],
                    ]);
                }
            }
        }

        if ($this->financeModules->canUseBankAccounts()) {
            $direct = $this->paymentMethods->getByCode('direct_transfer');
            if ($direct && $seller?->sellerPayoutProfile?->status === SellerPayoutProfile::STATUS_VERIFIED
                && $seller->sellerPayoutProfile->primary_mode === SellerPayoutProfile::MODE_DIRECT_BANK) {
                $options[] = array_merge($this->methodPayload($direct, 'direct_transfer'), [
                    'seller_bank' => $this->maskedSellerBank($seller),
                ]);
            }
        }

        return $options;
    }

    protected function methodPayload($method, string $legacyCode): array
    {
        return [
            'id' => $method->id,
            'code' => $method->code,
            'legacy_code' => $legacyCode,
            'name' => $method->localizedName(),
            'requires_admin_review' => $method->requires_admin_review,
            'requires_buyer_acknowledgement' => $method->requires_buyer_acknowledgement,
        ];
    }

    protected function maskedSellerBank(User $seller): array
    {
        $values = $seller->sellerPayoutProfile?->values ?? collect();
        $iban = trim((string) ($values->firstWhere('field_key', 'bank_iban')?->value_text ?? ''));
        $masked = strlen($iban) > 8
            ? substr($iban, 0, 4).'****'.substr($iban, -4)
            : $iban;

        return [
            'bank_name' => $values->firstWhere('field_key', 'bank_name')?->value_text,
            'account_holder' => $values->firstWhere('field_key', 'account_holder')?->value_text,
            'bank_iban' => $iban !== '' ? $iban : null,
            'bank_iban_masked' => $masked !== '' ? $masked : null,
        ];
    }
}
