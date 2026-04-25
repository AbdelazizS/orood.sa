<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessagingFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_conversation_index_returns_unread_count_and_last_message(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
        ]);

        $conversation = Conversation::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        $conversation->messages()->create([
            'user_id' => $buyer->id,
            'body' => 'Hello seller',
            'read' => false,
        ]);
        $conversation->messages()->create([
            'user_id' => $seller->id,
            'body' => 'Reply to buyer',
            'read' => false,
        ]);

        $sellerToken = $this->issueApiToken($seller);
        $response = $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->getJson('/api/v1/conversations')
            ->assertOk();

        $rows = $response->json('data');
        $this->assertIsArray($rows);
        $this->assertCount(1, $rows);
        $this->assertSame(1, (int) ($rows[0]['unread_count'] ?? -1));
        $this->assertSame('Reply to buyer', data_get($rows[0], 'last_message.body'));
    }

    public function test_opening_conversation_marks_peer_messages_as_read(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
        ]);

        $conversation = Conversation::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        $buyerMessage = $conversation->messages()->create([
            'user_id' => $buyer->id,
            'body' => 'Unread for seller',
            'read' => false,
        ]);
        $sellerMessage = $conversation->messages()->create([
            'user_id' => $seller->id,
            'body' => 'Own message should stay unread flag',
            'read' => false,
        ]);

        $sellerToken = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->getJson("/api/v1/conversations/{$conversation->id}")
            ->assertOk();

        $buyerMessage->refresh();
        $sellerMessage->refresh();
        $this->assertTrue($buyerMessage->read);
        $this->assertFalse($sellerMessage->read);
    }

    public function test_create_message_returns_conversation_id(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $response = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson('/api/v1/messages', [
                'product_id' => $product->id,
                'body' => 'Start conversation',
            ])
            ->assertCreated();

        $this->assertNotNull($response->json('conversation_id'));
    }

    public function test_create_direct_message_uses_recipient_id(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $tokenA = $this->issueApiToken($a);
        $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/messages', [
                'recipient_id' => $b->id,
                'body' => 'Hi from profile',
            ])
            ->assertCreated();

        $cid = (int) $response->json('conversation_id');
        $this->assertGreaterThan(0, $cid);

        $this->assertDatabaseHas('conversations', [
            'id' => $cid,
            'buyer_id' => $a->id,
            'seller_id' => $b->id,
            'conversation_type' => 'direct',
            'product_id' => null,
        ]);
    }

    public function test_direct_thread_is_stable_for_repeat_first_message(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $tokenA = $this->issueApiToken($a);

        $r1 = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/messages', [
                'recipient_id' => $b->id,
                'body' => 'First',
            ])
            ->assertCreated();
        $c1 = (int) $r1->json('conversation_id');

        $r2 = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/messages', [
                'recipient_id' => $b->id,
                'body' => 'Second',
            ])
            ->assertCreated();
        $c2 = (int) $r2->json('conversation_id');

        $this->assertSame($c1, $c2);
        $this->assertSame(2, \App\Models\Message::query()->where('conversation_id', $c1)->count());
    }

    public function test_seller_can_reply_on_direct_conversation(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $buyerToken = $this->issueApiToken($buyer);
        $sellerToken = $this->issueApiToken($seller);

        $open = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson('/api/v1/messages', [
                'recipient_id' => $seller->id,
                'body' => 'Hello',
            ])
            ->assertCreated();
        $cid = (int) $open->json('conversation_id');

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->postJson("/api/v1/conversations/{$cid}/messages", ['body' => 'Reply here'])
            ->assertCreated();
    }

    public function test_admin_open_direct_conversation_without_listing(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['role' => 'seller']);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/v1/admin/messages/open-direct-conversation', [
                'user_id' => $member->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.conversation_type', 'direct');

        $this->assertDatabaseHas('conversations', [
            'buyer_id' => $admin->id,
            'seller_id' => $member->id,
            'conversation_type' => 'direct',
        ]);
    }

    public function test_legacy_open_product_conversation_route_opens_direct(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['role' => 'buyer']);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/v1/admin/messages/open-product-conversation', [
                'user_id' => $member->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.conversation_type', 'direct');
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'messaging-flow-token-' . $user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
