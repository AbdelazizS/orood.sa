<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\GroupBuyReservation;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class WholesaleMarketApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_wholesale_show_includes_message_count_from_conversations(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 5,
            'status' => 'published',
            'message_count' => 0,
        ]);

        Conversation::create([
            'product_id' => $product->id,
            'buyer_id' => $buyerA->id,
            'seller_id' => $seller->id,
        ]);
        Conversation::create([
            'product_id' => $product->id,
            'buyer_id' => $buyerB->id,
            'seller_id' => $seller->id,
        ]);

        $this->getJson('/api/v1/wholesale/products/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.message_count', 2)
            ->assertJsonPath('data.stats.messages', 2);
    }

    public function test_wholesale_show_includes_active_buyer_count_for_pending_reservations(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 10,
            'status' => 'published',
        ]);

        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyerA->id,
            'quantity' => 2,
            'status' => GroupBuyReservation::STATUS_PENDING,
        ]);
        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyerB->id,
            'quantity' => 1,
            'status' => GroupBuyReservation::STATUS_PAYMENT_PENDING,
        ]);

        $this->getJson('/api/v1/wholesale/products/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.active_buyer_count', 2)
            ->assertJsonPath('data.reserved_seats', 3);
    }

    public function test_wholesale_show_sets_user_reserved_consistent_with_my_reservation_pending(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 10,
            'status' => 'published',
        ]);

        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'quantity' => 2,
            'status' => GroupBuyReservation::STATUS_PENDING,
        ]);

        $token = $this->issueApiToken($buyer);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/wholesale/products/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.user_reserved', true)
            ->assertJsonPath('data.my_reservation.status', GroupBuyReservation::STATUS_PENDING)
            ->assertJsonPath('data.my_reservation.quantity', 2)
            ->assertJsonPath('data.reserved_seats', 2)
            ->assertJsonPath('data.current_buyers', 2);
    }

    public function test_wholesale_show_sets_user_reserved_consistent_with_my_reservation_payment_pending(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 10,
            'status' => 'published',
        ]);

        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'quantity' => 1,
            'status' => GroupBuyReservation::STATUS_PAYMENT_PENDING,
        ]);

        $token = $this->issueApiToken($buyer);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/wholesale/products/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.user_reserved', true)
            ->assertJsonPath('data.my_reservation.status', GroupBuyReservation::STATUS_PAYMENT_PENDING);
    }

    public function test_admin_reserve_blocked_when_config_disabled(): void
    {
        Config::set('wholesale.admin_reserve_enabled', false);

        $seller = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 5,
            'status' => 'published',
        ]);

        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/wholesale/products/'.$product->id.'/reserve', ['quantity' => 1])
            ->assertStatus(422)
            ->assertJsonPath('message', __('wholesale.admin_cannot_reserve'));
    }

    public function test_listings_feed_excludes_wholesale_products(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $retail = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => false,
            'status' => 'published',
        ]);
        $wholesale = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 30,
            'min_quantity' => 5,
            'status' => 'published',
        ]);

        $ids = collect($this->getJson('/api/v1/listings?per_page=50')->json('data'))->pluck('id')->all();

        $this->assertContains($retail->id, $ids);
        $this->assertNotContains($wholesale->id, $ids);
    }

    public function test_homepage_sections_exclude_wholesale_products(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $wholesale = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'is_wholesale' => true,
            'wholesale_price' => 25,
            'min_quantity' => 3,
            'status' => 'published',
        ]);

        $resp = $this->getJson('/api/v1/homepage/sections')->assertOk();
        $latest = collect($resp->json('data.latest_offers', []))->pluck('id')->merge(
            collect($resp->json('data.cheapest', []))->pluck('id')
        )->unique()->all();

        $this->assertNotContains($wholesale->id, $latest);
    }

    public function test_wholesale_checkout_cod_persists_shipping_coordinates(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 99,
            'min_quantity' => 2,
            'status' => 'published',
            'allow_cod' => true,
        ]);

        $reservation = GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyer->id,
            'quantity' => 1,
            'status' => GroupBuyReservation::STATUS_PAYMENT_PENDING,
            'checkout_expires_at' => now()->addHour(),
            'price_snapshot' => 99.00,
        ]);

        $token = $this->issueApiToken($buyer);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/wholesale/reservations/'.$reservation->id.'/checkout', [
                'payment_method' => 'cod',
                'shipping_address' => 'Riyadh, District 1',
                'shipping_lat' => 24.7136,
                'shipping_lng' => 46.6753,
                'buyer_name' => 'Test Buyer',
                'buyer_phone' => '0512345678',
            ])
            ->assertCreated();

        $purchase = Purchase::query()->where('buyer_id', $buyer->id)->where('product_id', $product->id)->first();
        $this->assertNotNull($purchase);
        $this->assertSame(24.7136, (float) $purchase->shipping_lat);
        $this->assertSame(46.6753, (float) $purchase->shipping_lng);
    }

    public function test_reserve_rejects_quantity_above_remaining_slots(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 5,
            'status' => 'published',
        ]);

        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyerA->id,
            'quantity' => 3,
            'status' => GroupBuyReservation::STATUS_PENDING,
        ]);

        $tokenB = $this->issueApiToken($buyerB);

        $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->postJson('/api/v1/wholesale/products/'.$product->id.'/reserve', ['quantity' => 5])
            ->assertStatus(422)
            ->assertJsonPath('code', 'quantity_exceeds_remaining')
            ->assertJsonPath('data.remaining', 2);
    }

    public function test_reserve_succeeds_when_quantity_equals_remaining_slots(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 5,
            'status' => 'published',
        ]);

        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyerA->id,
            'quantity' => 3,
            'status' => GroupBuyReservation::STATUS_PENDING,
        ]);

        $tokenB = $this->issueApiToken($buyerB);

        $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->postJson('/api/v1/wholesale/products/'.$product->id.'/reserve', ['quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('code', 'reserved');
    }

    public function test_reserve_rejects_when_group_has_no_remaining_slots(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $buyerC = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'is_wholesale' => true,
            'wholesale_price' => 40,
            'min_quantity' => 2,
            'status' => 'published',
        ]);

        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyerA->id,
            'quantity' => 1,
            'status' => GroupBuyReservation::STATUS_PENDING,
        ]);
        GroupBuyReservation::query()->create([
            'product_id' => $product->id,
            'user_id' => $buyerB->id,
            'quantity' => 1,
            'status' => GroupBuyReservation::STATUS_PENDING,
        ]);

        app(\App\Services\WholesaleReservationLifecycleService::class)->syncProductProgress($product->fresh());

        $tokenC = $this->issueApiToken($buyerC);

        $this->withHeader('Authorization', "Bearer {$tokenC}")
            ->postJson('/api/v1/wholesale/products/'.$product->id.'/reserve', ['quantity' => 1])
            ->assertStatus(422)
            ->assertJsonPath('code', 'group_full');
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'wholesale-test-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
