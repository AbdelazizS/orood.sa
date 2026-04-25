<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresenceHeartbeatTest extends TestCase
{
    use RefreshDatabase;

    public function test_presence_updates_last_seen_and_online_flag(): void
    {
        $user = User::factory()->create([
            'last_seen' => null,
            'is_online' => false,
        ]);
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/presence')
            ->assertOk()
            ->assertJson(['ok' => true]);

        $user->refresh();
        $this->assertTrue((bool) $user->is_online);
        $this->assertNotNull($user->last_seen);
    }

    public function test_presence_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/presence')->assertUnauthorized();
    }

    public function test_logout_clears_online_flag(): void
    {
        $user = User::factory()->create([
            'last_seen' => now()->subMinute(),
            'is_online' => true,
        ]);
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $user->refresh();
        $this->assertFalse((bool) $user->is_online);
        $this->assertFalse($user->appearsOnline());
    }

    public function test_presence_offline_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/presence/offline')->assertUnauthorized();
    }

    public function test_presence_offline_marks_user_not_online(): void
    {
        $user = User::factory()->create([
            'last_seen' => now(),
            'is_online' => true,
        ]);
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/presence/offline')
            ->assertOk()
            ->assertJson(['ok' => true]);

        $user->refresh();
        $this->assertFalse((bool) $user->is_online);
        $this->assertFalse($user->appearsOnline());
    }

    public function test_appears_online_depends_on_last_seen_recency(): void
    {
        $fresh = User::factory()->create(['last_seen' => now()->subSeconds(30)]);
        $this->assertTrue($fresh->appearsOnline());

        $stale = User::factory()->create(['last_seen' => now()->subSeconds(120)]);
        $this->assertFalse($stale->appearsOnline());
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'presence-test-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
