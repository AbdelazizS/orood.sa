<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\SellerPayoutProfile;
use App\Models\User;
use App\Services\Listings\ListingActionResolver;
use App\Services\Listings\ListingActivationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingActionResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_awaiting_payment_setup_returns_primary_cta(): void
    {
        $seller = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'pending_review',
            'payout_activation_status' => 'pending_payout_setup',
            'moderation_status' => 'approved',
        ]);

        $state = app(ListingActionResolver::class)->resolve($product, $seller);

        $this->assertSame('awaiting_payment_setup', $state['status']);
        $this->assertTrue($state['blocking']);
        $this->assertNotEmpty($state['available_actions']);
        $this->assertSame('go_to_payment_setup', $state['available_actions'][0]['intent']);
        $this->assertStringContainsString('/dashboard/payment-setup', $state['available_actions'][0]['href']);
    }

    public function test_moderation_rejected_returns_edit_action(): void
    {
        $seller = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'moderation_status' => 'rejected',
            'rejection_reason' => 'Missing photos',
            'payout_activation_status' => 'active',
        ]);

        $state = app(ListingActionResolver::class)->resolve($product, $seller);

        $this->assertSame('moderation_rejected', $state['status']);
        $this->assertTrue($state['blocking']);
        $intents = array_column($state['available_actions'], 'intent');
        $this->assertContains('edit_listing', $intents);
    }

    public function test_platform_wallet_save_activates_pending_listings(): void
    {
        $seller = User::factory()->create();
        Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'pending_review',
            'payout_activation_status' => 'pending_payout_setup',
            'moderation_status' => 'approved',
        ]);

        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_PLATFORM_WALLET,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);

        $count = app(ListingActivationService::class)->activatePendingForSeller($seller);

        $this->assertSame(1, $count);
        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'payout_activation_status' => 'active',
            'status' => 'published',
        ]);
    }

    public function test_active_published_listing_has_no_actions(): void
    {
        $seller = User::factory()->create();
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_PLATFORM_WALLET,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'payout_activation_status' => 'active',
            'moderation_status' => 'approved',
        ]);

        $state = app(ListingActionResolver::class)->resolve($product, $seller);

        $this->assertSame('active', $state['status']);
        $this->assertFalse($state['blocking']);
        $this->assertSame([], $state['available_actions']);
    }

    public function test_listing_pending_notification_has_actions(): void
    {
        $seller = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $seller->id]);

        $payload = \App\Support\InAppNotificationPayload::listingPendingActivation($product, $seller->id);

        $this->assertSame('listing_pending_activation', $payload['type']);
        $this->assertNotEmpty($payload['data']['actions']);
        $this->assertSame('/dashboard/payment-setup', $payload['data']['actions'][0]['href']);
    }
}
