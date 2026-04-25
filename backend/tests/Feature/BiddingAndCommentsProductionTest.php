<?php

namespace Tests\Feature;

use App\Models\Bid;
use App\Models\Comment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BiddingAndCommentsProductionTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_bidding_hides_all_bids_for_guest(): void
    {
        $seller = User::factory()->create();
        $bidder = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'accept_bids' => true,
            'bids_visible' => false,
        ]);

        Bid::create([
            'product_id' => $product->id,
            'user_id' => $bidder->id,
            'amount' => 180,
            'is_visible' => true,
            'status' => Bid::STATUS_PENDING,
        ]);

        $this->getJson("/api/v1/products/{$product->id}/bids")
            ->assertOk()
            ->assertJsonPath('highest_bid', null)
            ->assertJsonPath('lowest_bid', null)
            ->assertJsonPath('bids_count', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_public_bidding_only_shows_pending_and_visible_rows_to_guests(): void
    {
        $seller = User::factory()->create();
        $bidderA = User::factory()->create(['username' => 'ahmed']);
        $bidderB = User::factory()->create(['username' => 'ali']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'accept_bids' => true,
            'bids_visible' => true,
        ]);

        Bid::create([
            'product_id' => $product->id,
            'user_id' => $bidderA->id,
            'amount' => 150,
            'is_visible' => true,
            'status' => Bid::STATUS_PENDING,
        ]);
        Bid::create([
            'product_id' => $product->id,
            'user_id' => $bidderB->id,
            'amount' => 190,
            'is_visible' => false,
            'status' => Bid::STATUS_PENDING,
        ]);
        Bid::create([
            'product_id' => $product->id,
            'user_id' => $bidderB->id,
            'amount' => 220,
            'is_visible' => true,
            'status' => Bid::STATUS_REJECTED,
        ]);

        $this->getJson("/api/v1/products/{$product->id}/bids")
            ->assertOk()
            ->assertJsonPath('highest_bid', 150)
            ->assertJsonPath('bids_count', 1)
            ->assertJsonCount(1, 'data');
    }

    public function test_listing_detail_masks_bid_aggregates_for_private_bidding_guest_view(): void
    {
        $seller = User::factory()->create();
        $bidder = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'accept_bids' => true,
            'bids_visible' => false,
        ]);

        Bid::create([
            'product_id' => $product->id,
            'user_id' => $bidder->id,
            'amount' => 300,
            'is_visible' => true,
            'status' => Bid::STATUS_PENDING,
        ]);

        $this->getJson("/api/v1/listings/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.highest_bid', null)
            ->assertJsonPath('data.current_bid_user_id', null)
            ->assertJsonPath('data.stats.bids', 0);
    }

    public function test_authenticated_user_can_reply_to_comment(): void
    {
        $seller = User::factory()->create();
        $replier = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'show_comments' => true,
        ]);
        $parent = Comment::create([
            'listing_id' => $product->id,
            'user_id' => $seller->id,
            'type' => 'REGULAR',
            'body' => 'Parent comment',
            'is_visible' => true,
        ]);

        $token = $this->issueApiToken($replier);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/products/{$product->id}/comments", [
                'body' => 'Reply body',
                'parent_id' => $parent->id,
            ])
            ->assertCreated()
            ->assertJsonPath('comment.parent_id', $parent->id);
    }

    public function test_guest_can_submit_listing_report(): void
    {
        $product = Product::factory()->create(['status' => 'published']);

        $this->postJson("/api/v1/listings/{$product->id}/report", [
            'email' => 'guest@example.com',
            'reason' => 'spam',
            'message' => 'This listing looks suspicious.',
        ])->assertCreated();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-' . $user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}

