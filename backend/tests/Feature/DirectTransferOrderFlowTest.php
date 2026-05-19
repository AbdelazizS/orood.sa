<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\OrderEditPolicy;
use App\Models\OrderPaymentRequest;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\SellerPayoutProfile;
use App\Models\SellerPayoutProfileValue;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DirectTransferOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PaymentMethodSeeder::class);
    }

    public function test_direct_transfer_purchase_starts_pending_for_seller_confirm(): void
    {
        [$purchase, $seller, $buyer] = $this->createDirectTransferPurchase();

        $this->assertSame(Purchase::STATUS_PENDING, $purchase->status);
        $this->assertNotNull($purchase->buyer_transfer_confirmed_at);

        $sellerNotification = Notification::where('user_id', $seller->id)
            ->where('type', 'purchase_new')
            ->first();
        $this->assertNotNull($sellerNotification);
        $this->assertSame('direct_transfer', data_get($sellerNotification->data, 'payment_method'));
    }

    public function test_seller_cannot_dispatch_direct_transfer_before_confirming_receipt(): void
    {
        [$purchase, $seller, $buyer] = $this->createDirectTransferPurchase();

        $sellerToken = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'dispatch_out_for_delivery' => true,
                'dispatch_location_confirmed' => true,
            ])
            ->assertStatus(422);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'confirm_direct_transfer' => true,
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'dispatch_out_for_delivery' => true,
                'dispatch_location_confirmed' => true,
            ])
            ->assertOk();

        $this->assertDatabaseHas('purchases', [
            'id' => $purchase->id,
            'status' => Purchase::STATUS_SHIPPED,
        ]);
    }

    public function test_admin_approve_does_not_advance_order_status(): void
    {
        [$purchase, , $paymentRequest, $buyer] = $this->createDirectTransferPurchase(returnPaymentRequest: true);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantFinanceApprovePermission($admin->role);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/finance/order-payments/{$paymentRequest->id}/approve")
            ->assertOk();

        $purchase->refresh();
        $this->assertSame(Purchase::STATUS_PENDING, $purchase->status);

        $this->assertFalse(
            Notification::where('user_id', $buyer->id)
                ->where('type', 'order_transfer_receipt_approved')
                ->exists()
        );
    }

    public function test_buyer_cannot_confirm_transfer_sent_after_checkout(): void
    {
        [$purchase, , $buyer] = $this->createDirectTransferPurchase();

        $buyerToken = $this->issueApiToken($buyer);

        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'confirm_transfer_sent' => true,
            ])
            ->assertStatus(422);
    }

    public function test_buyer_location_edit_respects_limits_and_rejects_seller(): void
    {
        OrderEditPolicy::globalPolicy()->update([
            'max_location_edits' => 1,
            'location_edit_window_hours' => 48,
            'location_edit_active' => true,
        ]);

        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 50,
            'status' => 'published',
            'moderation_status' => 'approved',
        ]);

        $purchase = Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 50,
            'quantity' => 1,
            'payment_method' => 'escrow',
            'status' => Purchase::STATUS_AWAITING_PAYMENT,
            'shipping_lat' => 24.7,
            'shipping_lng' => 46.7,
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $sellerToken = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'shipping_lat' => 24.8,
                'shipping_lng' => 46.8,
                'shipping_address' => 'Updated address',
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'shipping_lat' => 24.9,
                'shipping_lng' => 46.9,
            ])
            ->assertStatus(422);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchase->id}", [
                'shipping_lat' => 25.0,
                'shipping_lng' => 47.0,
            ])
            ->assertStatus(422);
    }

    /**
     * @return array{0: Purchase, 1: User, 2: User}|array{0: Purchase, 1: User, 2: OrderPaymentRequest, 3: User}
     */
    private function createDirectTransferPurchase(bool $returnPaymentRequest = false): array
    {
        $seller = User::factory()->create();
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_DIRECT_BANK,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);
        SellerPayoutProfileValue::create([
            'user_id' => $seller->id,
            'field_key' => 'bank_iban',
            'value_text' => 'SA0380000000608010167519',
        ]);

        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 100,
            'status' => 'published',
            'moderation_status' => 'approved',
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson("/api/v1/products/{$product->id}/purchase", [
                'payment_method' => 'direct_transfer',
                'quantity' => 1,
                'shipping_lat' => 24.7,
                'shipping_lng' => 46.7,
                'payment_fields' => [
                    'transfer_reference' => 'TRX-999',
                    'receipt_url' => 'https://cdn.example.com/receipt.pdf',
                ],
            ])
            ->assertCreated();

        $purchase = Purchase::where('buyer_id', $buyer->id)->where('product_id', $product->id)->firstOrFail();

        if ($returnPaymentRequest) {
            $paymentRequest = OrderPaymentRequest::where('purchase_id', $purchase->id)->firstOrFail();

            return [$purchase, $seller, $paymentRequest, $buyer];
        }

        return [$purchase, $seller, $buyer];
    }

    private function grantFinanceApprovePermission(string $role): void
    {
        Permission::updateOrCreate(
            ['name' => 'finance.approve_charge'],
            ['group' => 'finance', 'description' => 'Approve charges'],
        );

        DB::table('role_permission')->updateOrInsert(
            [
                'role' => $role,
                'permission_id' => Permission::where('name', 'finance.approve_charge')->value('id'),
            ],
            ['created_at' => now(), 'updated_at' => now()],
        );
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'dt-order-test-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
