<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Notification;
use App\Models\Product;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberCreditRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriberDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plain),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    private function subscriber(int $credits = 0): User
    {
        $user = User::factory()->create(['role' => 'subscriber']);
        if ($credits > 0) {
            SubscriberAdCredit::create(['subscriber_id' => $user->id, 'delta' => $credits, 'reason' => 'purchase']);
        }

        return $user;
    }

    public function test_overview_returns_live_stats(): void
    {
        $sub = $this->subscriber(5);
        SubscriberAdCredit::create(['subscriber_id' => $sub->id, 'delta' => -1, 'reason' => 'use']);

        $this->as($sub)->getJson('/api/v1/subscriber/overview')
            ->assertOk()
            ->assertJsonPath('data.credits_balance', 4)
            ->assertJsonPath('data.credits_purchased', 5)
            ->assertJsonPath('data.credits_used', 1)
            ->assertJsonPath('data.bought_count', 0)
            ->assertJsonPath('data.pending_credit_request', null);
    }

    public function test_credit_request_approve_flow(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $sub = $this->subscriber(1);

        $id = $this->as($sub)->postJson('/api/v1/subscriber/credit-requests', ['quantity' => 10, 'note' => 'تم التحويل'])
            ->assertCreated()
            ->json('data.id');

        // Admins are notified; a second pending request is refused.
        $this->assertTrue(Notification::query()->where('user_id', $admin->id)->where('type', 'subscriber_credit_request')->exists());
        $this->as($sub)->postJson('/api/v1/subscriber/credit-requests', ['quantity' => 3])->assertStatus(422);

        $this->as($admin)->getJson('/api/v1/admin/subscriber-credit-requests')
            ->assertOk()
            ->assertJsonPath('meta.pending_count', 1)
            ->assertJsonPath('data.0.subscriber.id', $sub->id);

        $this->as($admin)->postJson("/api/v1/admin/subscriber-credit-requests/{$id}/approve", ['quantity' => 8])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.approved_quantity', 8);

        $this->assertSame(9, $sub->fresh()->adCreditsBalance());
        $this->assertTrue(Notification::query()->where('user_id', $sub->id)->where('type', 'subscriber_credit_approved')->exists());

        // Can't be handled twice.
        $this->as($admin)->postJson("/api/v1/admin/subscriber-credit-requests/{$id}/approve")->assertStatus(422);

        $credits = $this->as($sub)->getJson('/api/v1/subscriber/credits')->assertOk();
        $this->assertSame(9, $credits->json('data.balance'));
        $this->assertSame('approved', $credits->json('data.requests.0.status'));
    }

    public function test_credit_request_reject_and_permissions(): void
    {
        $sub = $this->subscriber();
        $id = $this->as($sub)->postJson('/api/v1/subscriber/credit-requests', ['quantity' => 2])->json('data.id');

        $this->as(User::factory()->create(['role' => 'employee']))
            ->postJson("/api/v1/admin/subscriber-credit-requests/{$id}/approve")->assertForbidden();

        $this->as(User::factory()->create(['role' => 'manager']))
            ->postJson("/api/v1/admin/subscriber-credit-requests/{$id}/reject", ['admin_note' => 'لم يصل التحويل'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertSame(0, $sub->fresh()->adCreditsBalance());
        $this->assertSame(SubscriberCreditRequest::STATUS_REJECTED, SubscriberCreditRequest::find($id)->status);
    }

    public function test_support_conversation_with_admins(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $sub = $this->subscriber();

        $cid = $this->as($sub)->postJson('/api/v1/subscriber/support-conversation')->assertCreated()->json('data.conversation_id');
        // Opening again reuses the same conversation.
        $this->as($sub)->postJson('/api/v1/subscriber/support-conversation')->assertOk()->assertJsonPath('data.conversation_id', $cid);

        $conversation = Conversation::findOrFail($cid);
        $this->assertSame(Conversation::TYPE_DIRECT, $conversation->conversation_type);
        $this->assertEqualsCanonicalizing([$admin->id, $sub->id], [$conversation->buyer_id, $conversation->seller_id]);

        $this->as($sub)->postJson("/api/v1/conversations/{$cid}/messages", ['body' => 'أحتاج مساعدة في الرصيد'])->assertSuccessful();
        $this->as($sub)->getJson('/api/v1/conversations')->assertOk()->assertJsonFragment(['id' => $cid]);
        $this->as($admin)->getJson("/api/v1/admin/conversations/{$cid}")->assertOk();
    }

    public function test_subscriber_account_update(): void
    {
        $sub = $this->subscriber();

        $this->as($sub)->putJson('/api/v1/subscriber/account', ['name' => 'مسوق الرياض', 'phone' => '0555555555'])
            ->assertOk()
            ->assertJsonPath('data.name', 'مسوق الرياض')
            ->assertJsonPath('data.phone', '0555555555');
    }

    public function test_subscriber_cannot_post_public_content(): void
    {
        $sub = $this->subscriber();
        $product = Product::factory()->create(['status' => 'published', 'moderation_status' => 'approved', 'accept_bids' => true]);

        $this->as($sub)->postJson("/api/v1/products/{$product->id}/bids", ['amount' => 100])->assertForbidden();
        $this->as($sub)->postJson("/api/v1/products/{$product->id}/comments", ['body' => 'x'])->assertForbidden();
        $this->as($sub)->postJson('/api/v1/messages', ['product_id' => $product->id, 'body' => 'x'])->assertForbidden();
        $this->as($sub)->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'cod'])->assertForbidden();
        $this->as($sub)->postJson('/api/v1/reviews', ['reviewee_id' => $product->user_id, 'rating' => 5])->assertForbidden();

        // Normal members are unaffected by the guard.
        $buyer = User::factory()->create(['role' => 'buyer']);
        $this->as($buyer)->postJson("/api/v1/products/{$product->id}/comments", ['body' => 'هل ما زال متاحاً؟'])
            ->assertStatus(201);
    }
}
