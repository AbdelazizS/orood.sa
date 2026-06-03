<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\Finance\FinanceModuleSettings;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpenRequestPublishingTest extends TestCase
{
    use RefreshDatabase;

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PaymentMethodSeeder::class);
        app(FinanceModuleSettings::class)->update([
            'payments_module' => true,
            'escrow' => true,
            'financial_guarantee' => true,
            'bank_accounts' => true,
            'cod' => true,
            'wallet' => true,
        ]);
        FinanceModuleSettings::resetCache();
    }

    public function test_request_publishes_without_listing_schema_in_dynamic_category(): void
    {
        $category = Category::factory()->create([
            'dynamic_schema_enabled' => true,
        ]);
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'request',
                'title' => 'أبحث عن سيارة',
                'description' => 'وصف الطلب بالتفصيل الكافي للتحقق.',
                'category_id' => $category->id,
                'contact_phone' => true,
                'contact_phone_number' => '0512345678',
                'contact_messages' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'request');

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'type' => 'request',
            'category_id' => $category->id,
            'status' => 'published',
            'payout_activation_status' => 'active',
        ]);
    }

    public function test_request_publishes_without_payout_profile(): void
    {
        $category = Category::factory()->create();
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'request',
                'title' => 'طلب بدون حساب بنكي',
                'description' => 'وصف الطلب بالتفصيل الكافي للتحقق.',
                'category_id' => $category->id,
                'contact_messages' => true,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'type' => 'request',
            'status' => 'published',
            'payout_activation_status' => 'active',
        ]);
    }

    public function test_offer_can_be_created_without_images(): void
    {
        $category = Category::factory()->create();
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'عرض بدون صور',
                'description' => 'وصف العرض بالتفصيل الكافي للتحقق.',
                'category_id' => $category->id,
                'contact_messages' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'offer');

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'type' => 'offer',
            'status' => 'published',
            'payout_activation_status' => 'active',
        ]);
    }
}
