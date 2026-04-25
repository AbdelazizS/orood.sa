<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseEscrowFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_escrow_purchase_holds_funds_on_buyer_and_releases_to_seller_on_confirm(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 5000, 'escrow' => 0, 'withdrawable' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 1200,
            'status' => 'published',
            'allow_cod' => true,
        ]);

        $token = $this->issueApiToken($buyer);
        $purchaseId = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/products/{$product->id}/purchase", [
                'payment_method' => 'escrow',
            ])
            ->assertCreated()
            ->json('data.id');

        $buyerBalance->refresh();
        $this->assertSame(3800.0, (float) $buyerBalance->available);
        $this->assertSame(1200.0, (float) $buyerBalance->escrow);

        $sellerBalance = Balance::getOrCreateForUser($seller->id);
        $this->assertSame(0.0, (float) $sellerBalance->escrow);
        $this->assertSame(0.0, (float) $sellerBalance->withdrawable);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['confirm_receipt' => true])
            ->assertStatus(422);

        $sellerToken = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, [
                'tracking_number' => 'TRK-123',
                'carrier' => 'TestCarrier',
            ])
            ->assertOk();

        $this->assertSame(Purchase::STATUS_SHIPPED, Purchase::find($purchaseId)->status);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['confirm_receipt' => true])
            ->assertOk();

        $buyerBalance->refresh();
        $sellerBalance->refresh();
        $this->assertSame(3800.0, (float) $buyerBalance->available);
        $this->assertSame(0.0, (float) $buyerBalance->escrow);
        $this->assertSame(1200.0, (float) $sellerBalance->withdrawable);

        $this->assertSame(Purchase::STATUS_COMPLETED, Purchase::find($purchaseId)->status);
    }

    public function test_escrow_purchase_with_quantity_multiplies_hold_and_payout(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 5000, 'escrow' => 0, 'withdrawable' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 400,
            'status' => 'published',
        ]);

        $token = $this->issueApiToken($buyer);
        $purchaseId = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/products/{$product->id}/purchase", [
                'payment_method' => 'escrow',
                'quantity' => 3,
            ])
            ->assertCreated()
            ->json('data.id');

        $purchase = Purchase::find($purchaseId);
        $this->assertSame(1200.0, (float) $purchase->amount);
        $this->assertSame(3, (int) $purchase->quantity);

        $buyerBalance->refresh();
        $this->assertSame(3800.0, (float) $buyerBalance->available);
        $this->assertSame(1200.0, (float) $buyerBalance->escrow);

        $this->assertTrue(
            Notification::where('user_id', $seller->id)->where('type', 'purchase_new')->exists()
        );

        $sellerToken = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['tracking_number' => 'TRK-MULTI'])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['confirm_receipt' => true])
            ->assertOk();

        $sellerBalance = Balance::getOrCreateForUser($seller->id);
        $this->assertSame(1200.0, (float) $sellerBalance->withdrawable);
    }

    public function test_cod_order_requires_seller_accept_before_tracking(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 100,
            'status' => 'published',
            'allow_cod' => true,
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $sellerToken = $this->issueApiToken($seller);

        $purchaseId = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'cod'])
            ->assertCreated()
            ->json('data.id');

        $purchase = Purchase::find($purchaseId);
        $this->assertSame(Purchase::STATUS_COD_REQUESTED, $purchase->status);
        $this->assertNull($purchase->cod_seller_accepted_at);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['tracking_number' => 'X'])
            ->assertStatus(422);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['accept_cod' => true])
            ->assertOk();

        $this->assertSame(Purchase::STATUS_PENDING, Purchase::find($purchaseId)->status);
        $this->assertNotNull(Purchase::find($purchaseId)->cod_seller_accepted_at);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['tracking_number' => 'X'])
            ->assertOk();

        $this->assertSame(Purchase::STATUS_SHIPPED, Purchase::find($purchaseId)->status);
    }

    public function test_escrow_purchase_fails_when_buyer_has_insufficient_available_balance(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 100, 'escrow' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 500,
            'status' => 'published',
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'escrow'])
            ->assertStatus(422);
    }

    public function test_cod_rejected_when_listing_disallows_cod(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 300,
            'status' => 'published',
            'allow_cod' => false,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'cod'])
            ->assertStatus(422);
    }

    public function test_escrow_cancel_refunds_buyer_hold(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 2000, 'escrow' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 800,
            'status' => 'published',
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $purchaseId = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'escrow'])
            ->assertCreated()
            ->json('data.id');

        $buyerBalance->refresh();
        $this->assertSame(1200.0, (float) $buyerBalance->available);
        $this->assertSame(800.0, (float) $buyerBalance->escrow);

        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->putJson("/api/v1/account/orders/{$purchaseId}/cancel")
            ->assertOk();

        $buyerBalance->refresh();
        $this->assertSame(2000.0, (float) $buyerBalance->available);
        $this->assertSame(0.0, (float) $buyerBalance->escrow);
    }

    public function test_escrow_seller_cannot_mark_delivered_before_shipped(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 3000, 'escrow' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 500,
            'status' => 'published',
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $purchaseId = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'escrow'])
            ->assertCreated()
            ->json('data.id');

        $sellerToken = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['mark_delivered' => true])
            ->assertStatus(422);

        $this->assertSame(Purchase::STATUS_AWAITING_PAYMENT, Purchase::find($purchaseId)->status);
    }

    public function test_escrow_seller_marks_delivered_then_buyer_confirms(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 5000, 'escrow' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 900,
            'status' => 'published',
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $purchaseId = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'escrow'])
            ->assertCreated()
            ->json('data.id');

        $sellerToken = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, [
                'tracking_number' => 'TRK-900',
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['mark_delivered' => true])
            ->assertOk();

        $this->assertSame(Purchase::STATUS_DELIVERED, Purchase::find($purchaseId)->status);

        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->putJson('/api/v1/account/orders/'.$purchaseId, ['confirm_receipt' => true])
            ->assertOk();

        $sellerBalance = Balance::getOrCreateForUser($seller->id);
        $this->assertSame(900.0, (float) $sellerBalance->withdrawable);
        $this->assertSame(Purchase::STATUS_COMPLETED, Purchase::find($purchaseId)->status);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'purchase-escrow-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
