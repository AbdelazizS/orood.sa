<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_token_and_iso8601_expires_at(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Abdelaziz Mohammed',
            'email' => 'register-test@example.com',
            'password' => 'Qwer1234',
            'password_confirmation' => 'Qwer1234',
            'how_did_you_hear' => 'friend',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'expires_at', 'user' => ['id', 'email', 'created_at']]);

        $expiresAt = $response->json('expires_at');
        $this->assertIsString($expiresAt);
        $this->assertNotEmpty($expiresAt);
    }
}
