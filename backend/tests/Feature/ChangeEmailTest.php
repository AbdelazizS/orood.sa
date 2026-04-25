<?php

namespace Tests\Feature;

use App\Mail\OtpVerificationMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ChangeEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_email_with_otp(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'old@example.com',
            'password' => Hash::make('secretPass1!'),
        ]);

        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/change-email-request', [
                'email' => 'new@example.com',
                'current_password' => 'secretPass1!',
            ])
            ->assertOk();

        $captured = null;
        Mail::assertSent(OtpVerificationMail::class, function (OtpVerificationMail $mail) use (&$captured) {
            $captured = $mail->code;

            return true;
        });
        $this->assertNotNull($captured);
        $this->assertSame('new@example.com', $user->fresh()->pending_email);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/change-email-confirm', [
                'code' => $captured,
            ])
            ->assertOk()
            ->assertJsonPath('user.email', 'new@example.com');

        $user->refresh();
        $this->assertSame('new@example.com', $user->email);
        $this->assertNull($user->pending_email);
    }

    public function test_change_email_request_rejects_wrong_password(): void
    {
        $user = User::factory()->create([
            'email' => 'old@example.com',
            'password' => Hash::make('secretPass1!'),
        ]);
        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/change-email-request', [
                'email' => 'new@example.com',
                'current_password' => 'wrong',
            ])
            ->assertStatus(422);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'change-email-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
