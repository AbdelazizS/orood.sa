<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Permission;
use App\Models\User;
use App\Services\BrandingSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BrandingSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_branding_returns_defaults(): void
    {
        $this->getJson('/api/v1/branding')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'assets' => [
                        'logo_light',
                        'logo_dark',
                        'favicon',
                    ],
                    'placements' => [
                        'navbar',
                        'sidebar',
                        'footer',
                    ],
                    'legal' => [
                        'copyright_ar',
                        'copyright_en',
                        'copyright',
                    ],
                    'footer' => [
                        'show_developer_credit',
                        'developer_name',
                        'developer_linkedin_url',
                        'footer_tagline',
                        'violation_notice',
                    ],
                ],
            ])
            ->assertJsonPath('data.assets.logo_light', '/logo.png')
            ->assertJsonPath('data.placements.navbar.width', '220px');
    }

    public function test_public_branding_localizes_copyright(): void
    {
        $service = app(BrandingSettingsService::class);
        $service->update([
            'legal' => [
                'copyright_en' => 'Test EN © {year}',
                'copyright_ar' => 'اختبار AR © {year}',
            ],
        ]);

        $this->getJson('/api/v1/branding', ['Accept-Language' => 'en'])
            ->assertOk()
            ->assertJsonPath('data.legal.copyright', 'Test EN © {year}');
    }

    public function test_admin_can_update_branding(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSettingsPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/branding', [
                'legal' => [
                    'copyright_en' => 'Custom © {year}',
                ],
                'placements' => [
                    'navbar' => ['width_px' => 300],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.legal.copyright_en', 'Custom © {year}')
            ->assertJsonPath('data.placements.navbar.width_px', 300);

        $stored = AppSetting::getValue(BrandingSettingsService::KEY, []);
        $this->assertSame('Custom © {year}', $stored['legal']['copyright_en'] ?? null);
    }

    public function test_admin_can_upload_branding_asset(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSettingsPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $file = UploadedFile::fake()->create('logo.png', 100, 'image/png');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/v1/admin/branding/upload', [
                'file' => $file,
                'asset_key' => 'logo_light',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['url', 'path', 'asset_key']]);

        $url = $response->json('data.url');
        $this->assertStringStartsWith('/storage/branding/', $url);

        $this->getJson('/api/v1/branding')
            ->assertOk()
            ->assertJsonPath('data.assets.logo_light', $url);
    }

    public function test_public_footer_defaults_aziz_and_empty_violation(): void
    {
        $this->getJson('/api/v1/branding', ['Accept-Language' => 'ar'])
            ->assertOk()
            ->assertJsonPath('data.footer.developer_name', 'Aziz')
            ->assertJsonPath('data.footer.violation_notice', '');
    }

    public function test_admin_can_update_footer_developer_credit(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSettingsPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/branding', [
                'footer' => [
                    'show_developer_credit' => false,
                    'developer_name_en' => 'Test Dev',
                    'developer_linkedin_url' => 'https://www.linkedin.com/in/test',
                    'violation_notice_ar' => 'إشعار مخالفة',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.footer.show_developer_credit', false);

        $this->getJson('/api/v1/branding', ['Accept-Language' => 'ar'])
            ->assertOk()
            ->assertJsonPath('data.footer.show_developer_credit', false)
            ->assertJsonPath('data.footer.violation_notice', 'إشعار مخالفة');
    }

    public function test_null_assets_fallback_to_defaults_on_public_payload(): void
    {
        $service = app(BrandingSettingsService::class);
        $settings = $service->get();
        $settings['assets']['logo_light'] = null;
        AppSetting::putValue(BrandingSettingsService::KEY, $settings);

        $this->getJson('/api/v1/branding')
            ->assertOk()
            ->assertJsonPath('data.assets.logo_light', '/logo.png');
    }

    private function grantSettingsPermissions(string $role): void
    {
        Permission::updateOrCreate(['name' => 'settings.view'], ['group' => 'settings', 'description' => 'View settings']);
        Permission::updateOrCreate(['name' => 'settings.update'], ['group' => 'settings', 'description' => 'Update settings']);

        foreach (['settings.view', 'settings.update'] as $permissionName) {
            \Illuminate\Support\Facades\DB::table('role_permission')->updateOrInsert(
                ['role' => $role, 'permission_id' => Permission::where('name', $permissionName)->value('id')],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'branding-test-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
