<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDirectMessageAndGuaranteeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_direct_message_accepts_user_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = User::factory()->create(['role' => 'buyer']);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/messages/direct', [
                'user_id' => $client->id,
                'body' => 'Please upload bank receipt.',
                'purpose' => 'general',
            ])
            ->assertCreated();

        $note = Notification::query()->where('user_id', $client->id)->latest('id')->first();
        $this->assertNotNull($note);
        $this->assertSame('admin_notice', $note->type);
        $this->assertSame('notifications.adminNotice.general', $note->data['i18n_title_key'] ?? null);
        $this->assertSame('general', $note->data['purpose'] ?? null);
    }

    public function test_admin_direct_message_custom_requires_title(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = User::factory()->create(['role' => 'buyer']);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/messages/direct', [
                'user_id' => $client->id,
                'body' => 'Body only',
                'purpose' => 'custom',
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_deduct_guarantee_and_credit_buyer_when_purchase_linked(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller', 'financial_guarantee' => 1000]);
        $buyer = User::factory()->create(['role' => 'buyer']);
        Balance::getOrCreateForUser($buyer->id);

        $product = Product::factory()->create(['user_id' => $seller->id]);
        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 100,
            'payment_method' => 'escrow',
            'status' => Purchase::STATUS_PENDING,
        ]);

        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/users/{$seller->id}/deduct-guarantee", [
                'amount' => 150,
                'reason' => 'Compensation test',
                'purchase_id' => $purchase->id,
            ])
            ->assertOk();

        $seller->refresh();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $this->assertSame(850.0, (float) $seller->financial_guarantee);
        $this->assertSame(150.0, (float) $buyerBalance->fresh()->available);
    }

    private function issueApiToken(User $user): string
    {
        $plain = 'test-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plain),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plain;
    }
}
