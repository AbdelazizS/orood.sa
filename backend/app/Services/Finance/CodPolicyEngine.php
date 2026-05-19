<?php

namespace App\Services\Finance;

use App\Models\CodPolicy;
use App\Models\Product;
use App\Models\User;

class CodPolicyEngine
{
    /**
     * @return array{allowed: bool, buyer_must_accept: bool, seller_can_toggle: bool, policy_id: ?int}
     */
    public function evaluate(Product $product, ?User $buyer = null, ?User $seller = null): array
    {
        $seller = $seller ?? $product->seller;
        $policies = CodPolicy::query()->orderByDesc('priority')->get();

        $global = $policies->firstWhere('scope', CodPolicy::SCOPE_GLOBAL);
        if ($global && ! $global->enabled) {
            return [
                'allowed' => false,
                'buyer_must_accept' => true,
                'seller_can_toggle' => false,
                'policy_id' => $global->id,
            ];
        }

        $enabled = $global?->enabled ?? false;
        $buyerMustAccept = $global?->buyer_must_accept ?? true;
        $sellerCanToggle = $global?->seller_can_toggle ?? true;
        $policyId = $global?->id;

        foreach ($policies as $policy) {
            if (! $this->policyMatches($policy, $product, $seller)) {
                continue;
            }
            $enabled = $policy->enabled;
            $buyerMustAccept = $policy->buyer_must_accept;
            $sellerCanToggle = $policy->seller_can_toggle;
            $policyId = $policy->id;
        }

        if ($enabled && ! ($product->allow_cod ?? false)) {
            $enabled = false;
        }

        if ($enabled && $seller && $seller->sellerPayoutProfile) {
            if ($seller->sellerPayoutProfile->primary_mode === 'platform_wallet') {
                // COD still allowed unless policy says otherwise
            }
        }

        return [
            'allowed' => $enabled,
            'buyer_must_accept' => $buyerMustAccept,
            'seller_can_toggle' => $sellerCanToggle,
            'policy_id' => $policyId,
        ];
    }

    protected function policyMatches(CodPolicy $policy, Product $product, ?User $seller): bool
    {
        return match ($policy->scope) {
            CodPolicy::SCOPE_GLOBAL => true,
            CodPolicy::SCOPE_CATEGORY => (int) $policy->scope_id === (int) $product->category_id,
            CodPolicy::SCOPE_CITY => (int) $policy->scope_id === (int) $product->city_id,
            CodPolicy::SCOPE_SELLER => $seller && (int) $policy->scope_id === (int) $seller->id,
            default => false,
        };
    }
}
