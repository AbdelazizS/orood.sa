<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingReviewsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_list_reviews_for_public_listing_seller(): void
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
                'comment' => 'جيد',
            ])
            ->assertCreated();

        $this->getJson("/api/v1/listings/{$product->id}/reviews")
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'total', 'avg_rating', 'total_ratings'],
            ]);

        $payload = $this->getJson("/api/v1/listings/{$product->id}/reviews")->json();
        $this->assertCount(1, $payload['data']);
        $this->assertSame(1, (int) $payload['meta']['total']);
    }

    public function test_non_public_listing_returns_404_for_stranger(): void
    {
        $seller = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 100,
            'status' => 'draft',
        ]);

        $this->getJson("/api/v1/listings/{$product->id}/reviews")
            ->assertNotFound();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'listing-reviews-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
