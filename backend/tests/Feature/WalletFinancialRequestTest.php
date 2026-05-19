<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\FinancialRequest;
use App\Models\Permission;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WalletFinancialRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PaymentMethodSeeder::class);
    }

    public function test_charge_approve_requires_approval_note_and_credits_wallet(): void
    {
        $member = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantFinanceApprovePermission($admin->role);

        $memberToken = $this->issueApiToken($member);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/financial-requests/charge', [
                'payment_method_code' => 'bank_transfer',
                'values' => [
                    'amount' => 100,
                    'payer_bank_name' => 'Test Bank',
                    'transfer_reference' => 'REF-WALLET-1',
                    'receipt_url' => 'https://example.com/receipt.pdf',
                ],
            ])
            ->assertCreated();

        $request = FinancialRequest::query()
            ->where('user_id', $member->id)
            ->where('type', FinancialRequest::TYPE_WALLET_CHARGE)
            ->firstOrFail();

        $this->assertDatabaseHas('financial_request_values', [
            'financial_request_id' => $request->id,
            'field_key' => 'receipt_url',
            'file_url' => 'https://example.com/receipt.pdf',
        ]);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/finance/requests/{$request->id}/approve", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['approval_note']);

        $balanceBefore = (float) Balance::getOrCreateForUser($member->id)->available;

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/finance/requests/{$request->id}/approve", [
                'approval_note' => 'Verified bank transfer REF-WALLET-1 in platform account',
            ])
            ->assertOk();

        $request->refresh();
        $this->assertSame(FinancialRequest::STATUS_COMPLETED, $request->status);
        $this->assertSame(
            'Verified bank transfer REF-WALLET-1 in platform account',
            $request->admin_internal_note,
        );

        $balanceAfter = (float) Balance::getOrCreateForUser($member->id)->refresh()->available;
        $this->assertSame($balanceBefore + 100.0, $balanceAfter);
    }

    public function test_withdraw_approve_with_note_debits_withdrawable(): void
    {
        $member = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantFinanceApprovePermission($admin->role);

        Balance::getOrCreateForUser($member->id)->update([
            'available' => 500,
            'withdrawable' => 500,
            'escrow' => 0,
        ]);

        $memberToken = $this->issueApiToken($member);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/financial-requests/withdraw', [
                'payment_method_code' => 'wallet_withdraw_bank',
                'values' => [
                    'amount' => 150,
                    'bank_name' => 'Test Bank',
                    'bank_iban' => 'SA0380000000608010167519',
                    'account_holder' => $member->name,
                ],
            ])
            ->assertCreated();

        $request = FinancialRequest::query()
            ->where('user_id', $member->id)
            ->where('type', FinancialRequest::TYPE_WALLET_WITHDRAW)
            ->firstOrFail();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/finance/requests/{$request->id}/approve", [
                'approval_note' => 'Payout sent to member IBAN',
            ])
            ->assertOk();

        $balance = Balance::getOrCreateForUser($member->id)->refresh();
        $this->assertSame(350.0, (float) $balance->withdrawable);
        $this->assertSame(FinancialRequest::STATUS_COMPLETED, $request->fresh()->status);
    }

    public function test_admin_index_includes_user_payment_method_and_labeled_values(): void
    {
        $member = User::factory()->create(['name' => 'Wallet User', 'email' => 'wallet@example.com']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantFinanceApprovePermission($admin->role);

        $memberToken = $this->issueApiToken($member);
        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/financial-requests/charge', [
                'payment_method_code' => 'bank_transfer',
                'values' => [
                    'amount' => 50,
                    'payer_bank_name' => 'Bank A',
                    'transfer_reference' => 'REF-IDX',
                ],
            ])
            ->assertCreated();

        $adminToken = $this->issueApiToken($admin);
        $response = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/admin/finance/requests?status=pending')
            ->assertOk();

        $row = collect($response->json('data'))->first();
        $this->assertNotNull($row);
        $this->assertSame('wallet@example.com', $row['user']['email']);
        $this->assertNotEmpty($row['payment_method']['name']);
        $this->assertNotEmpty($row['values']);
        $this->assertArrayHasKey('label', $row['values'][0]);
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
        $plainTextToken = 'wallet-financial-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
