<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletSchemaApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_charge_schema_returns_methods_with_fields_and_limits(): void
    {
        $this->seed(PaymentMethodSeeder::class);

        $this->getJson('/api/v1/finance/wallet/charge-schema')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'currency',
                    'methods' => [
                        ['id', 'code', 'name', 'min_amount', 'fields'],
                    ],
                ],
            ])
            ->assertJsonPath('data.methods.0.min_amount', 10);
    }

    public function test_charge_schema_empty_when_bank_transfer_disabled(): void
    {
        $this->seed(PaymentMethodSeeder::class);

        PaymentMethod::query()->where('code', 'bank_transfer')->update(['enabled' => false]);

        $this->getJson('/api/v1/finance/wallet/charge-schema')
            ->assertOk()
            ->assertJsonPath('data.methods', []);
    }

    public function test_withdraw_schema_excludes_disabled_stc_pay(): void
    {
        $this->seed(PaymentMethodSeeder::class);

        $response = $this->getJson('/api/v1/finance/wallet/withdraw-schema')->assertOk();
        $codes = collect($response->json('data.methods'))->pluck('code')->all();

        $this->assertNotContains('stc_pay', $codes);
        $this->assertContains('wallet_withdraw_bank', $codes);
    }

    public function test_financial_charge_respects_min_amount(): void
    {
        $this->seed(PaymentMethodSeeder::class);
        $user = User::factory()->create();
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/account/financial-requests/charge', [
                'payment_method_code' => 'bank_transfer',
                'values' => [
                    'amount' => 5,
                    'payer_bank_name' => 'Test Bank',
                    'transfer_reference' => 'REF123',
                ],
            ])
            ->assertStatus(422);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'wallet-schema-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
