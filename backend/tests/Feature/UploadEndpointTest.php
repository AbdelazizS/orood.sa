<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_accepts_file_key_for_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $this->issueApiToken($user);

        $file = UploadedFile::fake()->create('receipt.jpg', 100, 'image/jpeg');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/v1/upload', ['file' => $file])
            ->assertCreated()
            ->assertJsonStructure(['url', 'path', 'data' => ['url']]);
    }

    public function test_upload_accepts_file_key_for_pdf(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $this->issueApiToken($user);

        $file = UploadedFile::fake()->create('receipt.pdf', 200, 'application/pdf');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/v1/upload', ['file' => $file])
            ->assertCreated()
            ->assertJsonStructure(['url']);
    }

    public function test_upload_still_accepts_image_key(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $this->issueApiToken($user);

        $file = UploadedFile::fake()->create('photo.png', 100, 'image/png');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->post('/api/v1/upload', ['image' => $file])
            ->assertCreated();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'upload-test-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
