<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\GuaranteeRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuaranteeRequestFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_submit_deposit_request_and_admin_can_approve(): void
    {
        $member = User::factory()->create(['role' => 'seller']);
        Balance::getOrCreateForUser($member->id)->update(['available' => 500]);

        $memberToken = $this->issueApiToken($member);

        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/guarantee-requests', [
                'type' => 'deposit',
                'amount' => 200,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('guarantee_requests', [
            'user_id' => $member->id,
            'type' => GuaranteeRequest::TYPE_DEPOSIT,
            'status' => GuaranteeRequest::STATUS_PENDING,
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $this->issueApiToken($admin);

        $req = GuaranteeRequest::query()->where('user_id', $member->id)->firstOrFail();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/guarantee-requests/{$req->id}/approve", [
                'funding_source' => 'platform_wallet',
            ])
            ->assertOk();

        $member->refresh();
        $this->assertSame(200.0, (float) $member->financial_guarantee);
        $this->assertSame(GuaranteeRequest::STATUS_APPROVED, $req->fresh()->status);
    }

    public function test_admin_can_approve_deposit_via_external_when_wallet_insufficient(): void
    {
        $member = User::factory()->create(['role' => 'seller']);
        Balance::getOrCreateForUser($member->id)->update(['available' => 100]);

        $memberToken = $this->issueApiToken($member);
        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/guarantee-requests', [
                'type' => 'deposit',
                'amount' => 5000,
            ])
            ->assertCreated();

        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $this->issueApiToken($admin);
        $req = GuaranteeRequest::query()->where('user_id', $member->id)->firstOrFail();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/guarantee-requests/{$req->id}/approve", [
                'funding_source' => 'platform_wallet',
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'INSUFFICIENT_WALLET_FOR_GUARANTEE');

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/guarantee-requests/{$req->id}/approve", [
                'funding_source' => 'external',
                'approval_note' => 'Bank transfer TRX-8844 confirmed by phone',
            ])
            ->assertOk();

        $member->refresh();
        $this->assertSame(5000.0, (float) $member->financial_guarantee);
        $this->assertSame(100.0, (float) Balance::getOrCreateForUser($member->id)->available);
        $this->assertSame('external', $req->fresh()->funding_source);
    }

    public function test_second_pending_request_is_rejected(): void
    {
        $member = User::factory()->create();
        Balance::getOrCreateForUser($member->id)->update(['available' => 1000]);
        $token = $this->issueApiToken($member);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/account/guarantee-requests', ['type' => 'deposit', 'amount' => 200])
            ->assertCreated();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/account/guarantee-requests', ['type' => 'deposit', 'amount' => 300])
            ->assertStatus(422);
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
