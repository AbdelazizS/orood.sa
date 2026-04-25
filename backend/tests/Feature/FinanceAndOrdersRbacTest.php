<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\ChargeRequest;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use App\Models\WithdrawalRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinanceAndOrdersRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_charge_idempotency_creates_single_pending_request_until_admin_approval(): void
    {
        $user = User::factory()->create();
        $balance = Balance::getOrCreateForUser($user->id);
        $balance->update(['available' => 100]);

        $token = $this->issueApiToken($user);
        $key = 'test-idem-key-'.uniqid();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/account/balance/charge', [
                'amount' => 4000,
                'payer_bank_name' => 'Al Rajhi',
                'transfer_reference' => 'TRX-4000-ABC',
                'receipt_url' => 'https://example.com/receipt.jpg',
                'note' => 'Bank transfer for wallet charge',
            ])
            ->assertCreated();

        $balance->refresh();
        $this->assertSame(100.0, (float) $balance->available);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/account/balance/charge', [
                'amount' => 4000,
                'payer_bank_name' => 'Al Rajhi',
                'transfer_reference' => 'TRX-4000-ABC',
            ])
            ->assertOk()
            ->assertJsonPath('data.idempotent_replay', true);

        $this->assertSame(1, ChargeRequest::where('user_id', $user->id)->count());

        $chargeRequest = ChargeRequest::where('user_id', $user->id)->firstOrFail();
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/charge-requests/{$chargeRequest->id}/approve")
            ->assertOk();

        $balance->refresh();
        $this->assertSame(4100.0, (float) $balance->available);
    }

    public function test_charge_request_requires_sender_bank_and_reference(): void
    {
        $user = User::factory()->create();
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/account/balance/charge', [
                'amount' => 500,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payer_bank_name', 'transfer_reference']);
    }

    public function test_admin_can_reject_charge_request_with_reason(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $this->issueApiToken($user);

        $chargeId = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/account/balance/charge', [
                'amount' => 700,
                'payer_bank_name' => 'SNB',
                'transfer_reference' => 'REF-700',
            ])
            ->assertCreated()
            ->json('data.charge_request.id');

        $adminToken = $this->issueApiToken($admin);
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/charge-requests/{$chargeId}/reject", [
                'reason' => 'Receipt not clear',
            ])
            ->assertOk();

        $this->assertDatabaseHas('charge_requests', [
            'id' => $chargeId,
            'status' => ChargeRequest::STATUS_REJECTED,
            'rejection_reason' => 'Receipt not clear',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => 'charge_request_rejected',
        ]);
    }

    public function test_charge_request_notifies_finance_staff_once_and_member_on_approve(): void
    {
        User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'super_admin']);
        $member = User::factory()->create(['role' => 'user']);
        $token = $this->issueApiToken($member);
        $idem = 'idem-charge-notify-'.uniqid();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('Idempotency-Key', $idem)
            ->postJson('/api/v1/account/balance/charge', [
                'amount' => 150,
                'payer_bank_name' => 'Riyad Bank',
                'transfer_reference' => 'REF-150',
            ])
            ->assertCreated();

        $pendingForStaff = Notification::where('type', 'charge_request_pending')->count();
        $this->assertSame(2, $pendingForStaff);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('Idempotency-Key', $idem)
            ->postJson('/api/v1/account/balance/charge', [
                'amount' => 150,
                'payer_bank_name' => 'Riyad Bank',
                'transfer_reference' => 'REF-150',
            ])
            ->assertOk()
            ->assertJsonPath('data.idempotent_replay', true);

        $this->assertSame(2, Notification::where('type', 'charge_request_pending')->count());

        $chargeRequest = ChargeRequest::where('user_id', $member->id)->firstOrFail();
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/charge-requests/{$chargeRequest->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'type' => 'charge_request_approved',
        ]);
    }

    public function test_cod_order_seller_ships_then_buyer_confirms_without_wallet_movement(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'price' => 400,
            'status' => 'published',
            'allow_cod' => true,
        ]);

        $buyerToken = $this->issueApiToken($buyer);
        $sellerToken = $this->issueApiToken($seller);

        $purchaseId = $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->postJson("/api/v1/products/{$product->id}/purchase", ['payment_method' => 'cod'])
            ->assertCreated()
            ->json('data.id');

        $purchase = Purchase::find($purchaseId);
        $this->assertSame(Purchase::STATUS_COD_REQUESTED, $purchase->status);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchaseId}", [
                'tracking_number' => 'TRK-1',
                'carrier' => 'TestCarrier',
            ])
            ->assertStatus(422);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchaseId}", ['accept_cod' => true])
            ->assertOk();

        $this->assertSame(Purchase::STATUS_PENDING, Purchase::find($purchaseId)->status);

        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->putJson("/api/v1/account/orders/{$purchaseId}", [
                'tracking_number' => 'TRK-1',
                'carrier' => 'TestCarrier',
            ])
            ->assertOk();

        $purchase->refresh();
        $this->assertSame(Purchase::STATUS_SHIPPED, $purchase->status);

        $this->withHeader('Authorization', "Bearer {$buyerToken}")
            ->putJson("/api/v1/account/orders/{$purchaseId}/confirm")
            ->assertOk();

        $purchase->refresh();
        $this->assertSame(Purchase::STATUS_COMPLETED, $purchase->status);
    }

    public function test_withdraw_response_message_is_localized_when_accept_language_is_arabic(): void
    {
        $user = User::factory()->create();
        $bal = Balance::getOrCreateForUser($user->id);
        $bal->update(['withdrawable' => 1000]);
        $token = $this->issueApiToken($user);

        $res = $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('Accept-Language', 'ar')
            ->postJson('/api/v1/account/withdraw', [
                'amount' => 50,
                'bank_iban' => 'SA0380000000608010167519',
                'bank_name' => 'Test Bank',
            ])
            ->assertCreated();

        $msg = $res->json('message');
        $this->assertIsString($msg);
        $this->assertStringContainsString('تم إرسال', $msg);
        $this->assertStringContainsString('المالية', $msg);
    }

    public function test_withdrawal_creates_pending_request_and_admin_approve_debits_withdrawable(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $bal = Balance::getOrCreateForUser($user->id);
        $bal->update(['available' => 0, 'withdrawable' => 500, 'escrow' => 0]);

        $userToken = $this->issueApiToken($user);
        $this->withHeader('Authorization', "Bearer {$userToken}")
            ->postJson('/api/v1/account/withdraw', [
                'amount' => 200,
                'bank_iban' => 'SA0380000000608010167519',
                'bank_name' => 'Test Bank',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('withdrawal_requests', [
            'user_id' => $user->id,
            'status' => WithdrawalRequest::STATUS_PENDING,
        ]);

        $wr = WithdrawalRequest::where('user_id', $user->id)->first();
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/withdrawal-requests/{$wr->id}/approve")
            ->assertOk();

        $bal->refresh();
        $this->assertSame(300.0, (float) $bal->withdrawable);
        $this->assertSame(WithdrawalRequest::STATUS_APPROVED, $wr->fresh()->status);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => 'withdrawal_request_approved',
        ]);
    }

    public function test_withdrawal_notifies_finance_staff_and_member_on_reject(): void
    {
        $member = User::factory()->create(['role' => 'user']);
        User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'super_admin']);

        $bal = Balance::getOrCreateForUser($member->id);
        $bal->update(['withdrawable' => 800]);

        $memberToken = $this->issueApiToken($member);
        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/withdraw', [
                'amount' => 100,
                'bank_iban' => 'SA0380000000608010167519',
                'bank_name' => 'Test Bank',
            ])
            ->assertCreated();

        $this->assertSame(2, Notification::where('type', 'withdrawal_request_pending')->count());

        $wr = WithdrawalRequest::where('user_id', $member->id)->firstOrFail();
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/withdrawal-requests/{$wr->id}/reject", [
                'reason' => 'IBAN mismatch',
            ])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'type' => 'withdrawal_request_rejected',
        ]);
    }

    public function test_withdrawal_notifies_two_finance_recipients_on_submit(): void
    {
        User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'super_admin']);
        $member = User::factory()->create();
        $bal = Balance::getOrCreateForUser($member->id);
        $bal->update(['withdrawable' => 400]);

        $token = $this->issueApiToken($member);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/account/withdraw', [
                'amount' => 100,
                'bank_iban' => 'SA0380000000608010167519',
                'bank_name' => 'SNB',
            ])
            ->assertCreated();

        $this->assertSame(2, Notification::where('type', 'withdrawal_request_pending')->count());
    }

    public function test_employee_without_orders_permission_cannot_list_admin_orders(): void
    {
        $permId = DB::table('permissions')->where('name', 'orders.view')->value('id');
        $this->assertNotNull($permId);
        DB::table('role_permission')
            ->where('role', 'employee')
            ->where('permission_id', $permId)
            ->delete();

        $employee = User::factory()->create(['role' => 'employee']);
        $token = $this->issueApiToken($employee);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/orders')
            ->assertForbidden();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
