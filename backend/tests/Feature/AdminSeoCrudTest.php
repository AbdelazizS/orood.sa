<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\SeoPageMeta;
use App\Models\User;
use Database\Seeders\SeoDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminSeoCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_global_and_page_meta(): void
    {
        $this->seed(SeoDefaultsSeeder::class);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSeoPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/seo/global', [
                'meta_description' => 'Updated global description for tests',
            ])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/seo/pages/home', [
                'seo_title' => 'Test Home Title',
                'meta_description' => 'Test home description',
            ])
            ->assertOk()
            ->assertJsonPath('data.seo_title', 'Test Home Title');

        $this->assertSame(
            'Test Home Title',
            SeoPageMeta::query()->where('page_key', 'home')->value('seo_title')
        );
    }

    public function test_non_admin_cannot_access_seo_panel(): void
    {
        $user = User::factory()->create(['role' => 'seller']);
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/seo/dashboard')
            ->assertStatus(403);
    }

    private function grantSeoPermissions(string $role): void
    {
        Permission::updateOrCreate(
            ['name' => 'seo.manage'],
            ['group' => 'seo', 'description' => 'Manage SEO']
        );

        DB::table('role_permission')->updateOrInsert(
            [
                'role' => $role,
                'permission_id' => Permission::where('name', 'seo.manage')->value('id'),
            ],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'seo-admin-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
