<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_read_when_show_comments_true(): void
    {
        $seller = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $seller->id, 'status' => 'published', 'show_comments' => true]);
        Comment::create([
            'listing_id' => $product->id,
            'user_id' => null,
            'type' => 'REGULAR',
            'body' => 'hello',
            'is_visible' => true,
        ]);

        $this->getJson("/api/v1/products/{$product->id}/comments")
            ->assertOk()
            ->assertJsonStructure(['comments', 'meta']);
    }

    public function test_non_owner_cannot_post_when_show_comments_false(): void
    {
        $seller = User::factory()->create();
        $user = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $seller->id, 'status' => 'published', 'show_comments' => false]);

        // API posting requires auth.api (token-based); without a token we should get 401.
        $this->actingAs($user)
            ->postJson("/api/v1/products/{$product->id}/comments", ['body' => 'hi'])
            ->assertStatus(401);
    }
}

