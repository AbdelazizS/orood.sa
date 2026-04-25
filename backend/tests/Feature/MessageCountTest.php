<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_count_tracks_unique_buyers_per_listing(): void
    {
        $seller = User::factory()->create();
        $buyerA = User::factory()->create();
        $buyerB = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'message_count' => 0,
        ]);

        $tokenA = $this->issueApiToken($buyerA);
        $tokenB = $this->issueApiToken($buyerB);

        $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/messages', [
                'product_id' => $product->id,
                'body' => 'Hello seller from A',
            ])
            ->assertCreated();

        $product->refresh();
        $this->assertSame(1, (int) $product->message_count);

        $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/messages', [
                'product_id' => $product->id,
                'body' => 'Second message from A',
            ])
            ->assertCreated();

        $product->refresh();
        $this->assertSame(1, (int) $product->message_count);

        $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->postJson('/api/v1/messages', [
                'product_id' => $product->id,
                'body' => 'Hello seller from B',
            ])
            ->assertCreated();

        $product->refresh();
        $this->assertSame(2, (int) $product->message_count);
    }

    public function test_message_count_repairs_stale_zero_using_existing_conversations(): void
    {
        $seller = User::factory()->create();
        $buyerA = User::factory()->create();
        $buyerB = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
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

        $tokenA = $this->issueApiToken($buyerA);
        $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/messages', [
                'product_id' => $product->id,
                'body' => 'Trigger recompute',
            ])
            ->assertCreated();

        $product->refresh();
        $this->assertSame(2, (int) $product->message_count);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'message-test-token-' . $user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}

