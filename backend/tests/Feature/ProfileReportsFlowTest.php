<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\ProfileReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileReportsFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_submit_profile_report(): void
    {
        $reported = User::factory()->create();
        $reporter = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $token = $this->issueApiToken($reporter);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/users/{$reported->id}/report", [
                'reason' => 'spam',
                'message' => 'Abusive behaviour on profile.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('profile_reports', [
            'reported_user_id' => $reported->id,
            'reporter_user_id' => $reporter->id,
            'status' => ProfileReport::STATUS_NEW,
        ]);

        $this->assertGreaterThanOrEqual(1, Notification::where('user_id', $admin->id)->where('type', 'staff_profile_report_new')->count());
    }

    public function test_guest_can_submit_profile_report_with_email(): void
    {
        $reported = User::factory()->create();

        $this->postJson("/api/v1/users/{$reported->id}/report", [
            'email' => 'guest@example.com',
            'message' => 'Spam account.',
        ])
            ->assertCreated();

        $this->assertDatabaseHas('profile_reports', [
            'reported_user_id' => $reported->id,
            'reporter_user_id' => null,
            'email' => 'guest@example.com',
        ]);
    }

    public function test_cannot_report_self(): void
    {
        $user = User::factory()->create();
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/users/{$user->id}/report", [
                'message' => 'test',
            ])
            ->assertStatus(422);
    }

    public function test_duplicate_active_report_rejected(): void
    {
        $reported = User::factory()->create();
        $reporter = User::factory()->create();
        $token = $this->issueApiToken($reporter);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/users/{$reported->id}/report", ['message' => 'First'])
            ->assertCreated();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/users/{$reported->id}/report", ['message' => 'Second'])
            ->assertStatus(422);
    }

    public function test_admin_can_manage_profile_reports(): void
    {
        $reported = User::factory()->create();
        $reporter = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $report = ProfileReport::create([
            'reported_user_id' => $reported->id,
            'reporter_user_id' => $reporter->id,
            'email' => $reporter->email,
            'reason' => 'spam',
            'message' => 'Test',
            'status' => ProfileReport::STATUS_NEW,
        ]);

        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/admin/profile-reports')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta', 'counts']);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/profile-reports/{$report->id}", [
                'status' => ProfileReport::STATUS_INVESTIGATING,
                'assigned_to' => $admin->id,
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/profile-reports/{$report->id}", [
                'status' => ProfileReport::STATUS_ACTION_TAKEN,
                'action_type' => 'no_action',
                'resolution_note' => 'Documented',
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/profile-reports/{$report->id}", [
                'status' => ProfileReport::STATUS_CLOSED,
            ])
            ->assertOk();

        $report->refresh();
        $this->assertSame(ProfileReport::STATUS_CLOSED, $report->status);
    }

    public function test_buyer_cannot_access_admin_profile_reports(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $token = $this->issueApiToken($buyer);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/profile-reports')
            ->assertForbidden();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'profile-report-token-' . $user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
