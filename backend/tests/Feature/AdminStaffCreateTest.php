<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminStaffCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_staff_with_arooth_com_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantAssignRoles($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/users', [
                'name' => 'SEO Manager',
                'email' => 'seo.manager@arooth.com',
                'password' => 'SecurePass1!',
                'password_confirmation' => 'SecurePass1!',
                'role' => 'admin',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'seo.manager@arooth.com');

        $this->assertDatabaseHas('users', [
            'email' => 'seo.manager@arooth.com',
            'role' => 'admin',
        ]);
    }

    public function test_rejects_arooth_sa_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantAssignRoles($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/users', [
                'name' => 'Bad Admin',
                'email' => 'bad@arooth.sa',
                'password' => 'SecurePass1!',
                'password_confirmation' => 'SecurePass1!',
                'role' => 'admin',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_rejects_weak_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantAssignRoles($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/users', [
                'name' => 'Weak Pass',
                'email' => 'weak@arooth.com',
                'password' => '123',
                'password_confirmation' => '123',
                'role' => 'admin',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    private function grantAssignRoles(string $role): void
    {
        Permission::updateOrCreate(
            ['name' => 'users.assign_roles'],
            ['group' => 'users', 'description' => 'Assign roles']
        );

        DB::table('role_permission')->updateOrInsert(
            [
                'role' => $role,
                'permission_id' => Permission::where('name', 'users.assign_roles')->value('id'),
            ],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'staff-test-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
