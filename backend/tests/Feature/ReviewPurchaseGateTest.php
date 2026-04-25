<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewPurchaseGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_create_review_after_completed_purchase(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 100,
            'status' => 'published',
        ]);
        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 100,
            'quantity' => 1,
            'payment_method' => 'cod',
            'status' => Purchase::STATUS_COMPLETED,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 5,
                'comment' => 'ممتاز',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('reviews', [
            'reviewer_id' => $buyer->id,
            'reviewee_id' => $seller->id,
            'purchase_id' => $purchase->id,
            'rating' => 5,
        ]);
        $seller->refresh();
        $this->assertSame(5.0, (float) $seller->rating);
        $this->assertSame(1, (int) $seller->total_ratings);
    }

    public function test_review_requires_purchase_id(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'rating' => 4,
            ])
            ->assertStatus(422);
    }

    public function test_review_rejects_wrong_counterparty(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $other = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 50,
            'status' => 'published',
        ]);
        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 50,
            'quantity' => 1,
            'payment_method' => 'cod',
            'status' => Purchase::STATUS_COMPLETED,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $other->id,
                'purchase_id' => $purchase->id,
                'rating' => 3,
            ])
            ->assertStatus(422);
    }

    public function test_review_rejects_non_completed_purchase(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 50,
            'status' => 'published',
        ]);
        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 50,
            'quantity' => 1,
            'payment_method' => 'cod',
            'status' => Purchase::STATUS_SHIPPED,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 4,
            ])
            ->assertStatus(422);
    }

    public function test_duplicate_purchase_review_updates_not_duplicates(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 10,
            'status' => 'published',
        ]);
        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 10,
            'quantity' => 1,
            'payment_method' => 'cod',
            'status' => Purchase::STATUS_COMPLETED,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 3,
            ])
            ->assertCreated();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 5,
            ])
            ->assertCreated();

        $this->assertSame(1, Review::where('purchase_id', $purchase->id)->where('reviewer_id', $buyer->id)->count());
        $seller->refresh();
        $this->assertSame(5.0, (float) $seller->rating);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'review-gate-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
