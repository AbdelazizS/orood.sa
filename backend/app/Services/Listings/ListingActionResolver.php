<?php

namespace App\Services\Listings;

use App\Models\Product;
use App\Models\SellerPayoutProfile;
use App\Models\User;
use App\Services\Finance\PaymentEligibilityEngine;

class ListingActionResolver
{
    public function __construct(
        private readonly PaymentEligibilityEngine $eligibility,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function resolve(Product $product, User $seller): array
    {
        $seller->loadMissing('sellerPayoutProfile');
        $setup = $this->eligibility->sellerSetupStatus($seller);
        $profile = $seller->sellerPayoutProfile;
        $payoutStatus = (string) ($product->payout_activation_status ?? 'active');
        $moderation = (string) ($product->moderation_status ?? 'approved');
        $dbStatus = (string) ($product->status ?? '');

        if ($moderation === 'rejected') {
            return $this->state(
                'moderation_rejected',
                blocking: true,
                priority: 100,
                requirements: ['moderation'],
                actions: [
                    $this->action('view_rejection', 'listingActions.viewRejection', 'view_rejection_reason', "/products/{$product->id}/edit?focus=rejection", 'secondary'),
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'primary'),
                    $this->action('hide_listing', 'listingActions.cancelListing', 'hide_listing', '#', 'outline'),
                ],
                extra: ['rejection_reason' => $product->rejection_reason],
            );
        }

        if ($profile?->status === SellerPayoutProfile::STATUS_REJECTED) {
            return $this->state(
                'payout_profile_rejected',
                blocking: true,
                priority: 90,
                requirements: ['payout_profile'],
                actions: [
                    $this->action('setup_payments', 'listingActions.setupPayments', 'go_to_payment_setup', '/dashboard/account?tab=payments', 'primary'),
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'secondary'),
                    $this->action('hide_listing', 'listingActions.cancelListing', 'hide_listing', '#', 'outline'),
                ],
                extra: ['rejection_reason' => $profile->rejection_reason],
            );
        }

        if ($payoutStatus === 'pending_payout_setup' || ! $setup['can_activate_listings']) {
            return $this->state(
                'awaiting_payment_setup',
                blocking: true,
                priority: 80,
                requirements: ['payout_profile'],
                actions: [
                    $this->action('setup_payments', 'listingActions.activateWithWallet', 'go_to_payment_setup', '/dashboard/account?tab=payments', 'primary'),
                    $this->action('learn_more', 'listingActions.learnMore', 'learn_more', '/dashboard/help', 'secondary'),
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'outline'),
                    $this->action('hide_listing', 'listingActions.cancelListing', 'hide_listing', '#', 'outline'),
                ],
            );
        }

        if ($profile?->status === SellerPayoutProfile::STATUS_PENDING_REVIEW) {
            return $this->state(
                'payout_profile_pending_review',
                blocking: true,
                priority: 70,
                requirements: ['payout_profile_review'],
                actions: [
                    $this->action('view_payment_setup', 'listingActions.setupPayments', 'go_to_payment_setup', '/dashboard/account?tab=payments', 'primary'),
                    $this->action('view_listing', 'listingActions.viewListing', 'view_listing', "/products/{$product->id}", 'secondary'),
                    $this->action('hide_listing', 'listingActions.cancelListing', 'hide_listing', '#', 'outline'),
                ],
            );
        }

        if ($moderation === 'pending') {
            return $this->state(
                'pending_moderation',
                blocking: false,
                priority: 50,
                requirements: ['moderation'],
                actions: [
                    $this->action('view_listing', 'listingActions.viewListing', 'view_listing', "/products/{$product->id}", 'primary'),
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'secondary'),
                ],
            );
        }

        if ($dbStatus === 'pending_review' && $setup['can_activate_listings']) {
            return $this->state(
                'pending_publish',
                blocking: false,
                priority: 40,
                requirements: [],
                actions: [
                    $this->action('view_listing', 'listingActions.viewListing', 'view_listing', "/products/{$product->id}", 'primary'),
                ],
            );
        }

        if ($dbStatus === 'hidden') {
            return $this->state(
                'hidden',
                blocking: false,
                priority: 30,
                requirements: [],
                actions: [
                    $this->action('show_listing', 'listingActions.showListing', 'show_listing', "/dashboard/listings", 'primary'),
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'secondary'),
                ],
            );
        }

        if ($dbStatus === 'sold') {
            return $this->state(
                'sold',
                blocking: false,
                priority: 20,
                requirements: [],
                actions: [
                    $this->action('view_listing', 'listingActions.viewListing', 'view_listing', "/products/{$product->id}", 'secondary'),
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'outline'),
                ],
            );
        }

        if ($dbStatus === 'archived') {
            return $this->state(
                'archived',
                blocking: false,
                priority: 15,
                requirements: [],
                actions: [
                    $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'secondary'),
                ],
            );
        }

        if ($dbStatus === 'published') {
            return $this->state(
                'active',
                blocking: false,
                priority: 0,
                requirements: [],
                actions: [],
            );
        }

        return $this->state(
            'pending_publish',
            blocking: false,
            priority: 10,
            requirements: [],
            actions: [
                $this->action('view_listing', 'listingActions.viewListing', 'view_listing', "/products/{$product->id}", 'primary'),
                $this->action('edit_listing', 'listingActions.editListing', 'edit_listing', "/products/{$product->id}/edit", 'secondary'),
            ],
        );
    }

    public function isBlocking(array $state): bool
    {
        return (bool) ($state['blocking'] ?? false);
    }

    /**
     * @param  list<array<string, mixed>>  $actions
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    protected function state(
        string $status,
        bool $blocking,
        int $priority,
        array $requirements,
        array $actions,
        array $extra = [],
    ): array {
        $copy = __("listing_state.{$status}");

        return array_merge([
            'status' => $status,
            'title' => is_array($copy) ? ($copy['title'] ?? $status) : $status,
            'message' => is_array($copy) ? ($copy['message'] ?? '') : '',
            'blocking' => $blocking,
            'priority' => $priority,
            'blocking_requirements' => $requirements,
            'available_actions' => $actions,
        ], $extra);
    }

    /**
     * @return array<string, mixed>
     */
    protected function action(
        string $key,
        string $i18nKey,
        string $intent,
        string $href,
        string $variant = 'primary',
    ): array {
        $serverKey = match ($i18nKey) {
            'listingActions.setupPayments' => 'listing_state.actions.setup_payments',
            'listingActions.activateWithWallet' => 'listing_state.actions.setup_payments',
            'listingActions.learnMore' => 'listing_state.actions.learn_more',
            'listingActions.editListing' => 'listing_state.actions.edit_listing',
            'listingActions.viewListing' => 'listing_state.actions.view_listing',
            'listingActions.viewRejection' => 'listing_state.actions.view_rejection',
            'listingActions.showListing' => 'listing_state.actions.show_listing',
            'listingActions.viewListings' => 'listing_state.actions.view_listings',
            'listingActions.renewListing' => 'listing_state.actions.renew_listing',
            'listingActions.cancelListing' => 'listing_state.actions.hide_listing',
            default => $i18nKey,
        };
        $label = __($serverKey);

        return [
            'label' => $label,
            'i18n_label_key' => $i18nKey,
            'action' => $key,
            'intent' => $intent,
            'href' => $href,
            'variant' => $variant,
        ];
    }
}
