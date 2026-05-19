<?php

namespace App\Support;

use App\Models\Bid;
use App\Models\Purchase;
use App\Models\User;
use App\Models\ViewRequest;

class UserAccountKindResolver
{
    /**
     * Public-facing account label: company, individual seller, or individual buyer.
     * Returns null when there is no meaningful activity to show.
     */
    public static function resolve(User $user, bool $forceListingSeller = false): ?string
    {
        if (self::isCompanyAccount($user)) {
            return 'company';
        }

        if ($forceListingSeller || self::publishedListingsCount($user) > 0) {
            return 'individual_seller';
        }

        if (self::hasBuyerActivity($user)) {
            return 'individual_buyer';
        }

        return null;
    }

    public static function isCompanyAccount(User $user): bool
    {
        if ($user->isCompany()) {
            return true;
        }

        if ((string) ($user->company_verification_status ?? '') === 'approved') {
            return true;
        }

        $company = $user->relationLoaded('company') ? $user->company : null;
        if ($company && $company->isApproved()) {
            return true;
        }

        return false;
    }

    public static function publishedListingsCount(User $user): int
    {
        if (isset($user->listings_count)) {
            return (int) $user->listings_count;
        }

        if (isset($user->_count['listings'])) {
            return (int) $user->_count['listings'];
        }

        return (int) $user->products()
            ->where('status', 'published')
            ->where(function ($q) {
                $q->where('moderation_status', 'approved')->orWhereNull('moderation_status');
            })
            ->count();
    }

    public static function hasBuyerActivity(User $user): bool
    {
        if (isset($user->has_buyer_activity)) {
            return (bool) $user->has_buyer_activity;
        }

        return $user->purchasesAsBuyer()->exists()
            || Bid::query()->where('user_id', $user->id)->exists()
            || ViewRequest::query()->where('requester_id', $user->id)->exists();
    }
}
