<?php

namespace Tests\Feature;

use App\Models\ListingReport;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingReportsFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_submit_listing_report_as_authenticated_user(): void
    {
        $seller = User::factory()->create();
        $reporter = User::factory()->create();
        $listing = Product::factory()->create(['user_id' => $seller->id, 'status' => 'published']);

        $token = $this->issueApiToken($reporter);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/listings/{$listing->id}/report", [
                'reason' => 'fraud',
                'message' => 'Suspicious listing details.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('listing_reports', [
            'product_id' => $listing->id,
            'user_id' => $reporter->id,
            'status' => ListingReport::STATUS_NEW,
        ]);
    }

    public function test_admin_can_move_report_through_enforcement_flow_and_apply_action(): void
    {
        $seller = User::factory()->create();
        $reporter = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $listing = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'moderation_status' => 'approved',
        ]);
        $report = ListingReport::create([
            'product_id' => $listing->id,
            'user_id' => $reporter->id,
            'email' => $reporter->email,
            'reason' => 'spam',
            'message' => 'Spam content',
            'status' => ListingReport::STATUS_NEW,
        ]);

        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/listing-reports/{$report->id}", [
                'status' => ListingReport::STATUS_INVESTIGATING,
                'assigned_to' => $admin->id,
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/listing-reports/{$report->id}", [
                'status' => ListingReport::STATUS_ACTION_TAKEN,
                'action_type' => 'hide_listing',
                'resolution_note' => 'Hidden due to confirmed abuse',
            ])
            ->assertOk();

        $listing->refresh();
        $this->assertSame('suspended', $listing->status);
        $this->assertSame('rejected', $listing->moderation_status);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/listing-reports/{$report->id}", [
                'status' => ListingReport::STATUS_CLOSED,
            ])
            ->assertOk();

        $report->refresh();
        $this->assertSame(ListingReport::STATUS_CLOSED, $report->status);
    }

    public function test_admin_can_list_listing_reports_and_assignees(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $listing = Product::factory()->create(['status' => 'published']);
        ListingReport::create([
            'product_id' => $listing->id,
            'user_id' => null,
            'email' => 'r@example.com',
            'reason' => 'spam',
            'message' => 'Test',
            'status' => ListingReport::STATUS_NEW,
        ]);

        $token = $this->issueApiToken($admin);

        $listResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/listing-reports')
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'meta',
                'counts' => [
                    'all',
                    ListingReport::STATUS_NEW,
                    ListingReport::STATUS_INVESTIGATING,
                    ListingReport::STATUS_ACTION_TAKEN,
                    ListingReport::STATUS_REJECTED,
                    ListingReport::STATUS_CLOSED,
                ],
            ]);

        $listResponse->assertJsonPath('counts.all', 1);
        $listResponse->assertJsonPath('counts.' . ListingReport::STATUS_NEW, 1);
        $rows = $listResponse->json('data');
        $this->assertIsArray($rows);
        $this->assertNotEmpty($rows);
        $this->assertSame(['investigating'], $rows[0]['allowed_next_statuses'] ?? null);

        $assigneesResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/listing-reports/assignees');

        $assigneesResponse->assertOk()->assertJsonStructure(['data']);

        $assigneeIds = collect($assigneesResponse->json('data'))->pluck('id')->all();
        $this->assertContains($admin->id, $assigneeIds);
    }

    public function test_admin_index_search_finds_guest_report_by_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $listing = Product::factory()->create(['status' => 'published']);
        ListingReport::create([
            'product_id' => $listing->id,
            'user_id' => null,
            'email' => 'unique_guest_search@example.com',
            'reason' => 'other',
            'message' => 'Guest body',
            'status' => ListingReport::STATUS_NEW,
        ]);

        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/listing-reports?search=unique_guest_search@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_show_includes_allowed_next_statuses(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $listing = Product::factory()->create(['status' => 'published']);
        $report = ListingReport::create([
            'product_id' => $listing->id,
            'user_id' => null,
            'email' => 'x@y.com',
            'reason' => 'spam',
            'message' => 'Hi',
            'status' => ListingReport::STATUS_INVESTIGATING,
        ]);

        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/admin/listing-reports/{$report->id}")
            ->assertOk()
            ->assertJsonPath('data.allowed_next_statuses', [
                ListingReport::STATUS_ACTION_TAKEN,
                ListingReport::STATUS_REJECTED,
            ]);
    }

    public function test_non_staff_cannot_access_admin_listing_reports(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $token = $this->issueApiToken($buyer);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/listing-reports')
            ->assertForbidden();
    }

    public function test_invalid_transition_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $listing = Product::factory()->create(['status' => 'published']);
        $report = ListingReport::create([
            'product_id' => $listing->id,
            'user_id' => null,
            'email' => 'guest@example.com',
            'reason' => 'other',
            'message' => 'Guest report',
            'status' => ListingReport::STATUS_NEW,
        ]);

        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/listing-reports/{$report->id}", [
                'status' => ListingReport::STATUS_CLOSED,
            ])
            ->assertStatus(422);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'listing-report-token-' . $user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}

