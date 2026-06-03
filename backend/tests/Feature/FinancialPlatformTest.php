<?php

namespace Tests\Feature;

use App\Models\CodPolicy;
use App\Models\Notification;
use App\Models\PaymentMethod;
use App\Models\Permission;
use App\Models\Product;
use App\Models\SellerPayoutProfile;
use App\Models\SellerPayoutProfileValue;
use App\Models\User;
use App\Services\Finance\FinanceModuleSettings;
use Illuminate\Support\Facades\DB;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialPlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PaymentMethodSeeder::class);
        $this->enableFinanceModules();
    }

    /**
     * @param  array<string, bool>  $overrides
     */
    protected function enableFinanceModules(array $overrides = []): void
    {
        app(FinanceModuleSettings::class)->update(array_merge([
            'payments_module' => true,
            'escrow' => true,
            'financial_guarantee' => true,
            'bank_accounts' => true,
            'cod' => true,
            'wallet' => true,
        ], $overrides));
        FinanceModuleSettings::resetCache();
    }

    public function test_finance_modules_public_endpoint_defaults_off(): void
    {
        FinanceModuleSettings::resetCache();
        \App\Models\AppSetting::query()->where('key', FinanceModuleSettings::KEY)->delete();
        FinanceModuleSettings::resetCache();

        $this->getJson('/api/v1/finance/modules')
            ->assertOk()
            ->assertJsonPath('data.payments_module', false)
            ->assertJsonPath('data.wallet', false);

        $this->enableFinanceModules();
    }

    public function test_listing_active_without_payout_when_payments_module_off(): void
    {
        $this->enableFinanceModules(['payments_module' => false, 'bank_accounts' => false]);

        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'MVP listing',
                'description' => 'Description long enough for validation rules.',
                'price' => 50,
                'image_urls' => ['https://example.com/img.jpg'],
                'contact_phone' => true,
                'contact_phone_number' => '0512345678',
                'contact_messages' => true,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'payout_activation_status' => 'active',
        ]);
    }

    public function test_public_payment_methods_endpoint(): void
    {
        $response = $this->getJson('/api/v1/payment-methods?context=charge');

        $response->assertOk();
        $response->assertJsonStructure(['data']);
    }

    public function test_cod_blocked_when_global_policy_disabled(): void
    {
        $seller = User::factory()->create();
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_PLATFORM_WALLET,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);

        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 100,
            'status' => 'published',
            'moderation_status' => 'approved',
            'allow_cod' => true,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/products/{$product->id}/checkout-payment-options")
            ->assertOk()
            ->assertJsonMissing(['legacy_code' => 'cod']);
    }

    public function test_cod_available_when_global_policy_enabled(): void
    {
        CodPolicy::query()->updateOrCreate(
            ['scope' => CodPolicy::SCOPE_GLOBAL, 'scope_id' => null],
            [
                'enabled' => true,
                'buyer_must_accept' => true,
                'seller_can_toggle' => true,
                'priority' => 100,
            ]
        );

        $seller = User::factory()->create();
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_PLATFORM_WALLET,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);

        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 100,
            'status' => 'published',
            'moderation_status' => 'approved',
            'allow_cod' => true,
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/products/{$product->id}/checkout-payment-options")
            ->assertOk()
            ->assertJsonFragment(['legacy_code' => 'cod']);
    }

    public function test_listing_pending_payout_setup_when_seller_not_verified(): void
    {
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $payload = [
            'type' => 'offer',
            'title' => 'Test listing',
            'description' => 'Description long enough for validation rules.',
            'price' => 50,
            'image_urls' => ['https://example.com/img.jpg'],
            'contact_phone' => true,
            'contact_phone_number' => '0512345678',
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', $payload);

        $response->assertCreated();
        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'payout_activation_status' => 'pending_payout_setup',
        ]);
    }

    public function test_seller_can_save_platform_wallet_profile(): void
    {
        $seller = User::factory()->create();

        $token = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/seller/payout-profile', [
                'enable_direct_bank' => false,
                'accept_cod' => false,
            ])
            ->assertOk();

        $this->assertDatabaseHas('seller_payout_profiles', [
            'user_id' => $seller->id,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'primary_mode' => SellerPayoutProfile::MODE_PLATFORM_WALLET,
        ]);
    }

    public function test_platform_wallet_activates_pending_listings(): void
    {
        $seller = User::factory()->create();
        Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'pending_review',
            'payout_activation_status' => 'pending_payout_setup',
            'moderation_status' => 'approved',
        ]);

        $token = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/seller/payout-profile', [
                'enable_direct_bank' => false,
                'accept_cod' => false,
            ])
            ->assertOk();

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'payout_activation_status' => 'active',
            'status' => 'published',
        ]);
    }

    public function test_payout_profile_returns_capabilities(): void
    {
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/seller/payout-profile')
            ->assertOk()
            ->assertJsonPath('data.capabilities.platform_wallet_available', true)
            ->assertJsonStructure([
                'data' => [
                    'capabilities' => [
                        'platform_wallet_available',
                        'direct_bank_available',
                        'cod_available',
                        'cod_seller_can_toggle',
                    ],
                ],
            ]);
    }

    public function test_accept_cod_rejected_when_admin_disabled(): void
    {
        CodPolicy::query()->updateOrCreate(
            ['scope' => CodPolicy::SCOPE_GLOBAL, 'scope_id' => null],
            [
                'enabled' => false,
                'buyer_must_accept' => true,
                'seller_can_toggle' => true,
                'priority' => 100,
            ]
        );

        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/seller/payout-profile', [
                'enable_direct_bank' => false,
                'accept_cod' => true,
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_verify_pending_payout_profile(): void
    {
        $seller = User::factory()->create();
        $profile = SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_DIRECT_BANK,
            'status' => SellerPayoutProfile::STATUS_PENDING_REVIEW,
        ]);
        SellerPayoutProfileValue::create([
            'user_id' => $seller->id,
            'field_key' => 'bank_iban',
            'value_text' => 'SA0380000000608010167519',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantFinanceApprovePermission($admin->role);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/finance/payout-profiles/{$profile->user_id}/verify")
            ->assertOk();

        $this->assertDatabaseHas('seller_payout_profiles', [
            'user_id' => $seller->id,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $seller->id,
            'type' => 'payout_profile_verified',
        ]);
    }

    public function test_checkout_direct_transfer_includes_full_seller_iban(): void
    {
        $seller = User::factory()->create();
        $iban = 'SA0380000000608010167519';
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_DIRECT_BANK,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);
        SellerPayoutProfileValue::create([
            'user_id' => $seller->id,
            'field_key' => 'bank_name',
            'value_text' => 'STC Bank',
        ]);
        SellerPayoutProfileValue::create([
            'user_id' => $seller->id,
            'field_key' => 'account_holder',
            'value_text' => 'Mohammed',
        ]);
        SellerPayoutProfileValue::create([
            'user_id' => $seller->id,
            'field_key' => 'bank_iban',
            'value_text' => $iban,
        ]);

        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 250,
            'status' => 'published',
            'moderation_status' => 'approved',
        ]);

        $token = $this->issueApiToken($buyer);
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/products/{$product->id}/checkout-payment-options")
            ->assertOk();

        $options = collect($response->json('data'));
        $direct = $options->firstWhere('legacy_code', 'direct_transfer');
        $this->assertNotNull($direct);
        $this->assertSame($iban, $direct['seller_bank']['bank_iban'] ?? null);
        $this->assertSame('STC Bank', $direct['seller_bank']['bank_name'] ?? null);
    }

    public function test_direct_transfer_purchase_with_payment_fields(): void
    {
        $seller = User::factory()->create();
        SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_DIRECT_BANK,
            'status' => SellerPayoutProfile::STATUS_VERIFIED,
            'verified_at' => now(),
        ]);
        SellerPayoutProfileValue::create([
            'user_id' => $seller->id,
            'field_key' => 'bank_iban',
            'value_text' => 'SA0380000000608010167519',
        ]);

        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 100,
            'status' => 'published',
            'moderation_status' => 'approved',
        ]);

        $token = $this->issueApiToken($buyer);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/products/{$product->id}/purchase", [
                'payment_method' => 'direct_transfer',
                'quantity' => 1,
                'shipping_lat' => 24.7,
                'shipping_lng' => 46.7,
                'payment_fields' => [
                    'transfer_reference' => 'TRX-12345',
                    'receipt_url' => 'https://cdn.example.com/receipt.pdf',
                    'note' => 'Paid',
                ],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('purchases', [
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'payment_method' => 'direct_transfer',
        ]);

        $this->assertDatabaseHas('order_payment_request_values', [
            'field_key' => 'transfer_reference',
            'value_text' => 'TRX-12345',
        ]);
    }

    public function test_admin_reject_payout_profile_notifies_seller(): void
    {
        $seller = User::factory()->create();
        $profile = SellerPayoutProfile::create([
            'user_id' => $seller->id,
            'primary_mode' => SellerPayoutProfile::MODE_DIRECT_BANK,
            'status' => SellerPayoutProfile::STATUS_PENDING_REVIEW,
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->grantFinanceApprovePermission($admin->role);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/finance/payout-profiles/{$profile->user_id}/reject", [
                'reason' => 'IBAN does not match account holder',
            ])
            ->assertOk();

        $this->assertDatabaseHas('seller_payout_profiles', [
            'user_id' => $seller->id,
            'status' => SellerPayoutProfile::STATUS_REJECTED,
        ]);

        $this->assertTrue(
            Notification::where('user_id', $seller->id)->where('type', 'payout_profile_rejected')->exists()
        );
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
        $plainTextToken = 'finance-test-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
