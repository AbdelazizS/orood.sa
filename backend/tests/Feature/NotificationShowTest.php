<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_own_notification(): void
    {
        $user = User::factory()->create();
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'test',
            'title' => 'Hello',
            'body' => 'Body',
            'data' => ['link' => '/dashboard/orders/1'],
        ]);

        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/notifications/'.$notification->id)
            ->assertOk()
            ->assertJsonPath('data.id', $notification->id)
            ->assertJsonPath('data.title', 'Hello');
    }

    public function test_other_user_cannot_fetch_notification(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $notification = Notification::create([
            'user_id' => $owner->id,
            'type' => 'test',
            'title' => 'Private',
            'body' => null,
            'data' => [],
        ]);

        $token = $this->issueApiToken($other);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/notifications/'.$notification->id)
            ->assertForbidden();
    }

    public function test_guest_cannot_fetch_notification(): void
    {
        $user = User::factory()->create();
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'test',
            'title' => 'X',
            'body' => null,
            'data' => [],
        ]);

        $this->getJson('/api/v1/notifications/'.$notification->id)
            ->assertUnauthorized();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'notification-show-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
