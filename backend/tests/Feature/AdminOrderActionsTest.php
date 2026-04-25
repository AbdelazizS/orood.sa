<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminOrderActionsTest extends TestCase
{
    use RefreshDatabase;

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }

    public function test_admin_cancel_stores_reason_and_sets_cancelled(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

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
            'status' => Purchase::STATUS_PENDING,
        ]);

        $token = $this->issueApiToken($admin);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/orders/{$purchase->id}/cancel", [
                'reason' => 'Buyer requested cancellation',
            ])
            ->assertOk();

        $purchase->refresh();
        $this->assertSame(Purchase::STATUS_CANCELLED, $purchase->status);
        $this->assertSame('Buyer requested cancellation', $purchase->admin_cancellation_reason);
        $this->assertNotNull($purchase->admin_cancelled_at);
        $this->assertSame($admin->id, (int) $purchase->admin_cancelled_by);
    }

    public function test_admin_force_complete_from_disputed_releases_escrow_to_seller(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $buyerBalance = Balance::getOrCreateForUser($buyer->id);
        $buyerBalance->update(['available' => 0, 'escrow' => 200, 'withdrawable' => 0]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 200,
            'status' => 'published',
        ]);

        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 200,
            'quantity' => 1,
            'payment_method' => 'escrow',
            'status' => Purchase::STATUS_DISPUTED,
        ]);

        $token = $this->issueApiToken($admin);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/orders/{$purchase->id}/force-complete")
            ->assertOk();

        $buyerBalance->refresh();
        $sellerBalance = Balance::getOrCreateForUser($seller->id);
        $sellerBalance->refresh();
        $this->assertSame(0.0, (float) $buyerBalance->escrow, 'Escrow hold for this order should be released');
        $this->assertSame(200.0, (float) $sellerBalance->withdrawable);
        $this->assertSame(Purchase::STATUS_COMPLETED, $purchase->fresh()->status);
    }

    public function test_force_refund_forbidden_without_orders_refund_permission(): void
    {
        $employee = User::factory()->create(['role' => 'employee']);
        $refundPermId = DB::table('permissions')->where('name', 'orders.refund')->value('id');
        if ($refundPermId) {
            DB::table('role_permission')
                ->where('role', 'employee')
                ->where('permission_id', $refundPermId)
                ->delete();
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
            'status' => Purchase::STATUS_PENDING,
        ]);

        $token = $this->issueApiToken($employee);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/orders/{$purchase->id}/force-refund", ['reason' => 'test'])
            ->assertForbidden();
    }
}
