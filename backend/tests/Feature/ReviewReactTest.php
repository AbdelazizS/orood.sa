<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Review;
use App\Models\ReviewReaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ReviewReactTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_like_a_review(): void
    {
        if (! Schema::hasTable('review_reactions')) {
            $this->markTestSkipped('review_reactions table not migrated');
        }

        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $reactor = User::factory()->create();
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

        $tokenBuyer = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$tokenBuyer}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 4,
                'comment' => 'ok',
            ])
            ->assertCreated();

        $review = Review::where('reviewer_id', $buyer->id)->where('reviewee_id', $seller->id)->first();
        $this->assertNotNull($review);

        $tokenReactor = $this->issueApiToken($reactor);
        $this->withHeader('Authorization', "Bearer {$tokenReactor}")
            ->postJson("/api/v1/reviews/{$review->id}/react", ['type' => 'like'])
            ->assertOk()
            ->assertJsonPath('review.like_count', 1);

        $this->assertDatabaseHas('review_reactions', [
            'review_id' => $review->id,
            'user_id' => $reactor->id,
            'type' => ReviewReaction::TYPE_LIKE,
        ]);
    }

    public function test_reviewer_cannot_react_to_own_review(): void
    {
        if (! Schema::hasTable('review_reactions')) {
            $this->markTestSkipped('review_reactions table not migrated');
        }

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
            'status' => Purchase::STATUS_COMPLETED,
        ]);

        $tokenBuyer = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$tokenBuyer}")
            ->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 4,
                'comment' => 'ok',
            ])
            ->assertCreated();

        $review = Review::where('reviewer_id', $buyer->id)->first();
        $this->withHeader('Authorization', "Bearer {$tokenBuyer}")
            ->postJson("/api/v1/reviews/{$review->id}/react", ['type' => 'like'])
            ->assertStatus(422);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'review-react-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
