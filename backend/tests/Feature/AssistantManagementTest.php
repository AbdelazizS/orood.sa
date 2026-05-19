<?php

namespace Tests\Feature;

use App\Models\Assistant;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssistantManagementTest extends TestCase
{
    use RefreshDatabase;

    private function seedAssistantsManagePermission(): void
    {
        $permId = Permission::updateOrCreate(
            ['name' => 'assistants.manage'],
            ['group' => 'assistants', 'description' => 'Manage assistants']
        )->id;

        DB::table('role_permission')->updateOrInsert(
            ['role' => 'admin', 'permission_id' => $permId],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }

    private function issueApiToken(User $user): string
    {
        $plain = Str::random(40);
        $user->forceFill([
            'api_token' => hash('sha256', $plain),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plain;
    }

    public function test_admin_can_create_assistant_with_user_types(): void
    {
        $this->seedAssistantsManagePermission();
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $this->issueApiToken($admin);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/assistants', [
                'full_name' => 'Ahmed Support',
                'email' => 'ahmed.assistant@example.com',
                'password' => 'Secret123!',
                'phone' => '0500000000',
                'job_role' => 'support_agent',
                'assigned_user_types' => ['individual', 'company'],
                'status' => 'active',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'ahmed.assistant@example.com',
            'role' => 'assistant',
        ]);
        $assistant = Assistant::query()->whereHas('user', fn ($q) => $q->where('email', 'ahmed.assistant@example.com'))->first();
        $this->assertNotNull($assistant);
        $this->assertEqualsCanonicalizing(['individual', 'company'], $assistant->assignedUserTypes());
    }

    public function test_inactive_assistant_cannot_login(): void
    {
        $user = User::factory()->create([
            'role' => 'assistant',
            'email' => 'inactive@example.com',
            'password' => Hash::make('Secret123!'),
            'email_verified_at' => now(),
        ]);
        $assistant = Assistant::create([
            'user_id' => $user->id,
            'job_role' => 'viewer_only',
            'status' => Assistant::STATUS_INACTIVE,
        ]);
        $assistant->syncUserTypes(['individual']);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'Secret123!',
        ]);

        $response->assertForbidden();
    }

    public function test_assistant_user_list_is_scoped_by_assigned_types(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $companyUser = User::factory()->create(['role' => 'company']);
        $marketer = User::factory()->create(['role' => 'marketer']);

        $assistantUser = User::factory()->create(['role' => 'assistant']);
        $assistant = Assistant::create([
            'user_id' => $assistantUser->id,
            'job_role' => 'support_agent',
            'status' => Assistant::STATUS_ACTIVE,
        ]);
        $assistant->syncUserTypes(['individual']);

        $token = $this->issueApiToken($assistantUser);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/users');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($buyer->id, $ids);
        $this->assertNotContains($companyUser->id, $ids);
        $this->assertNotContains($marketer->id, $ids);
    }
}
