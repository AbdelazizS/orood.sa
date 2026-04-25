<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_password_policy_endpoint_returns_simple_by_default(): void
    {
        $this->getJson('/api/v1/auth/password-policy')
            ->assertOk()
            ->assertJson([
                'mode' => 'simple',
                'min_length' => 6,
                'requires' => ['letter', 'number'],
            ]);
    }

    public function test_register_requires_letters_and_numbers_in_simple_mode(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'simple-policy@example.com',
            'password' => 'abcdef',
            'password_confirmation' => 'abcdef',
        ])->assertStatus(422);
    }

    public function test_admin_can_toggle_complex_policy(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/admin/security/password-policy', ['mode' => 'complex'])
            ->assertOk()
            ->assertJson([
                'mode' => 'complex',
                'min_length' => 8,
            ]);

        $this->getJson('/api/v1/auth/password-policy')
            ->assertOk()
            ->assertJson([
                'mode' => 'complex',
                'min_length' => 8,
            ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Complex User',
            'email' => 'complex-policy@example.com',
            'password' => 'abc12345',
            'password_confirmation' => 'abc12345',
        ])->assertStatus(422);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'password-policy-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}

