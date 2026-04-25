<?php

namespace Tests\Feature;

use App\Models\Balance;
use App\Models\GuaranteeRequest;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ComplianceNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guarantee_deposit_request_notifies_staff_and_approve_notifies_member(): void
    {
        $member = User::factory()->create(['role' => 'seller']);
        Balance::getOrCreateForUser($member->id)->update(['available' => 500]);
        $admin = User::factory()->create(['role' => 'admin']);

        $memberToken = $this->issueApiToken($member);
        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/guarantee-requests', [
                'type' => 'deposit',
                'amount' => 200,
            ])
            ->assertCreated();

        $this->assertGreaterThanOrEqual(1, Notification::query()->where('type', 'guarantee_request_pending')->count());
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => 'guarantee_request_pending',
        ]);

        $adminToken = $this->issueApiToken($admin);
        $req = GuaranteeRequest::query()->where('user_id', $member->id)->firstOrFail();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/guarantee-requests/{$req->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'type' => 'guarantee_request_approved',
        ]);
    }

    public function test_guarantee_reject_notifies_member(): void
    {
        $member = User::factory()->create(['role' => 'seller']);
        Balance::getOrCreateForUser($member->id)->update(['available' => 500]);
        $admin = User::factory()->create(['role' => 'admin']);

        $memberToken = $this->issueApiToken($member);
        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->postJson('/api/v1/account/guarantee-requests', [
                'type' => 'deposit',
                'amount' => 200,
            ])
            ->assertCreated();

        $req = GuaranteeRequest::query()->where('user_id', $member->id)->firstOrFail();
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/guarantee-requests/{$req->id}/reject", ['admin_note' => 'Insufficient documentation'])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'type' => 'guarantee_request_rejected',
        ]);
    }

    public function test_document_verification_submit_notifies_staff_and_approve_notifies_member(): void
    {
        Storage::fake('public');
        $member = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);

        $file = UploadedFile::fake()->create('id-doc.pdf', 120, 'application/pdf');
        $memberToken = $this->issueApiToken($member);

        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->post('/api/v1/account/verify-document', [
                'type' => 'id_card',
                'document' => $file,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => 'document_verification_pending',
        ]);

        $adminToken = $this->issueApiToken($admin);
        $dvId = \App\Models\DocumentVerification::query()->where('user_id', $member->id)->value('id');

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/verifications/{$dvId}/approve")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'type' => 'document_verification_approved',
        ]);
    }

    public function test_document_verification_reject_notifies_member(): void
    {
        Storage::fake('public');
        $member = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);

        $file = UploadedFile::fake()->create('id-doc.pdf', 120, 'application/pdf');
        $memberToken = $this->issueApiToken($member);

        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->post('/api/v1/account/verify-document', [
                'type' => 'id_card',
                'document' => $file,
            ])
            ->assertCreated();

        $adminToken = $this->issueApiToken($admin);
        $dvId = \App\Models\DocumentVerification::query()->where('user_id', $member->id)->value('id');

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/verifications/{$dvId}/reject", ['reason' => 'Blurry scan'])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $member->id,
            'type' => 'document_verification_rejected',
        ]);
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
