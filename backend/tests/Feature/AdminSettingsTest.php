<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Permission;
use App\Models\SellerPayoutProfile;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_and_update_settings_bundle(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSettingsPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/settings')
            ->assertOk()
            ->assertJsonStructure(['data' => ['security', 'account', 'auth', 'content', 'payments', 'contact']]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/settings/content', [
                'listings_auto_publish_on_create' => false,
                'default_bids_visible' => false,
                'default_comments_visible' => true,
            ])
            ->assertOk();

        $this->assertSame(false, (bool) AppSetting::getValue('content.listings_auto_publish_on_create', true));
        $this->assertSame(false, (bool) AppSetting::getValue('content.default_bids_visible', true));
    }

    public function test_admin_can_update_payments_and_contact_settings(): void
    {
        $this->seed(PaymentMethodSeeder::class);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSettingsPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/settings/contact', [
                'hero_title_en' => 'Contact OROOD',
                'notify_emails' => ['ops@orood.test'],
            ])
            ->assertOk()
            ->assertJsonPath('data.hero_title_en', 'Contact OROOD');

        $methodId = DB::table('payment_methods')->where('code', 'bank_transfer')->value('id');
        $this->assertNotNull($methodId);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/settings/payments', [
                'cod_global' => ['enabled' => true, 'buyer_must_accept' => false],
                'payment_methods' => [
                    ['id' => $methodId, 'enabled' => true, 'instructions' => ['ar' => ['iban' => 'SA0000000000000000000000']]],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.cod_global.enabled', true);
    }

    public function test_admin_settings_payments_include_payout_profiles_queue_count(): void
    {
        $this->seed(PaymentMethodSeeder::class);

        $seller = User::factory()->create();
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => \App\Models\SellerPayoutProfile::MODE_DIRECT_BANK,
            'status' => \App\Models\SellerPayoutProfile::STATUS_PENDING_REVIEW,
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantSettingsPermissions($admin->role);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.payments.queue_counts.payout_profiles_pending', 1);
    }

    public function test_settings_update_is_forbidden_without_settings_update_permission(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Permission::updateOrCreate(['name' => 'settings.view'], ['group' => 'settings', 'description' => 'View settings']);
        DB::table('role_permission')->insert([
            'role' => $admin->role,
            'permission_id' => Permission::where('name', 'settings.view')->value('id'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $this->issueApiToken($admin);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/settings/account', ['allow_company_registration' => false])
            ->assertStatus(403);
    }

    private function grantSettingsPermissions(string $role): void
    {
        Permission::updateOrCreate(['name' => 'settings.view'], ['group' => 'settings', 'description' => 'View settings']);
        Permission::updateOrCreate(['name' => 'settings.update'], ['group' => 'settings', 'description' => 'Update settings']);

        foreach (['settings.view', 'settings.update'] as $permissionName) {
            DB::table('role_permission')->updateOrInsert(
                ['role' => $role, 'permission_id' => Permission::where('name', $permissionName)->value('id')],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'admin-settings-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}

