<?php

namespace App\Services\Finance;

use App\Models\PaymentMethod;
use App\Models\SellerPayoutProfile;
use App\Models\SellerPayoutProfileValue;
use App\Models\User;
use App\Services\Listings\ListingActivationService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SellerPayoutProfileService
{
    public function __construct(
        private readonly PaymentMethodService $paymentMethods,
        private readonly DynamicFormValidator $validator,
        private readonly FinancialNotificationDispatcher $notifications,
        private readonly ListingActivationService $listingActivation,
        private readonly SellerPayoutCapabilities $capabilities,
    ) {}

    public function getOrCreate(User $user): SellerPayoutProfile
    {
        return SellerPayoutProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => SellerPayoutProfile::STATUS_INCOMPLETE]
        );
    }

    /**
     * @param  array{enable_direct_bank?: bool, accept_cod?: bool, fields?: array<string, mixed>, primary_mode?: string}  $payload
     */
    public function save(User $user, array $payload): SellerPayoutProfile
    {
        $caps = $this->capabilities->forSeller();
        $enableDirectBank = (bool) ($payload['enable_direct_bank'] ?? false);
        $acceptCod = (bool) ($payload['accept_cod'] ?? false);
        $fieldsInput = $payload['fields'] ?? [];

        if ($acceptCod && ! $caps['cod_available']) {
            throw new InvalidArgumentException(__('finance.cod_not_available'));
        }

        if ($enableDirectBank && ! $caps['direct_bank_available']) {
            throw new InvalidArgumentException(__('finance.direct_bank_not_available'));
        }

        $profile = $this->getOrCreate($user);
        $profile->accept_cod = $acceptCod && $caps['cod_available'];

        if ($enableDirectBank) {
            return $this->saveDirectBank($user, $profile, $fieldsInput);
        }

        return $this->savePlatformWallet($user, $profile);
    }

    protected function savePlatformWallet(User $user, SellerPayoutProfile $profile): SellerPayoutProfile
    {
        $profile->primary_mode = SellerPayoutProfile::MODE_PLATFORM_WALLET;
        $profile->status = SellerPayoutProfile::STATUS_VERIFIED;
        $profile->verified_at = now();
        $profile->rejection_reason = null;
        $profile->save();

        $this->listingActivation->activatePendingForSeller($user);

        return $profile->fresh(['values']);
    }

    /**
     * @param  array<string, mixed>  $fieldsInput
     */
    protected function saveDirectBank(User $user, SellerPayoutProfile $profile, array $fieldsInput): SellerPayoutProfile
    {
        $direct = $this->paymentMethods->getByCode(PaymentMethod::CODE_DIRECT_TRANSFER);
        $fieldDefs = $direct
            ? $this->paymentMethods->fieldsForContext($direct, 'payout_profile')
            : collect();

        if ($fieldDefs->isNotEmpty()) {
            $this->validator->validate($fieldDefs, $fieldsInput);
        }

        return DB::transaction(function () use ($user, $profile, $fieldsInput, $fieldDefs) {
            foreach ($fieldsInput as $key => $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                $def = $fieldDefs->firstWhere('field_key', $key);
                SellerPayoutProfileValue::updateOrCreate(
                    ['user_id' => $user->id, 'field_key' => $key],
                    [
                        'payment_method_field_id' => $def?->id,
                        'value_text' => is_scalar($value) ? (string) $value : null,
                        'value_json' => is_array($value) ? $value : null,
                    ]
                );
            }

            $profile->primary_mode = SellerPayoutProfile::MODE_DIRECT_BANK;
            $profile->status = SellerPayoutProfile::STATUS_PENDING_REVIEW;
            $profile->verified_at = null;
            $profile->save();

            $loaded = $profile->load(['values', 'user']);
            $this->notifications->payoutProfilePendingReview($loaded);

            return $loaded;
        });
    }

    public function verify(SellerPayoutProfile $profile, User $admin): SellerPayoutProfile
    {
        $profile->update([
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
            'reviewed_by' => $admin->id,
            'rejection_reason' => null,
        ]);

        $this->notifications->payoutProfileVerified($profile->user);
        $this->listingActivation->activatePendingForSeller($profile->user);

        return $profile->fresh();
    }

    public function reject(SellerPayoutProfile $profile, User $admin, string $reason): SellerPayoutProfile
    {
        $profile->update([
            'status' => SellerPayoutProfile::STATUS_REJECTED,
            'reviewed_by' => $admin->id,
            'rejection_reason' => $reason,
        ]);

        $fresh = $profile->fresh(['user']);
        if ($fresh->user) {
            $this->notifications->payoutProfileRejected($fresh->user, $reason);
        }

        return $fresh;
    }
}
