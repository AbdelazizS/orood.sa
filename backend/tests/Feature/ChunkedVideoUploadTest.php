<?php

namespace Tests\Feature;

use App\Models\CompanyVideo;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Large videos upload in 1 MB pieces (no "POST data is too large"), joined when the video is saved. */
class ChunkedVideoUploadTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    /** Bytes that start like a real MP4 (ftyp box) so the server recognises the type. */
    private function fakeMp4(int $bytes): string
    {
        $head = pack('N', 24).'ftypmp42'.pack('N', 0).'mp42isom';

        return $head.str_repeat("\0", $bytes - strlen($head));
    }

    private function sendInChunks(User $user, string $data, string $uploadId, int $chunkSize = 1024 * 1024): void
    {
        $parts = str_split($data, $chunkSize);
        foreach ($parts as $i => $part) {
            $this->as($user)->post('/api/v1/uploads/video-chunks', [
                'upload_id' => $uploadId,
                'index' => $i,
                'total' => count($parts),
                'chunk' => UploadedFile::fake()->createWithContent('part', $part),
            ], ['Accept' => 'application/json'])->assertOk();
        }
    }

    public function test_listing_video_uploaded_in_pieces_is_joined_and_saved(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create(['role' => 'seller']);
        $listing = Product::factory()->create(['user_id' => $owner->id, 'status' => 'published', 'moderation_status' => 'approved']);
        $data = $this->fakeMp4((int) (2.5 * 1024 * 1024));
        $uploadId = (string) Str::uuid();

        $this->sendInChunks($owner, $data, $uploadId);

        $res = $this->as($owner)->postJson('/api/v1/products/'.$listing->id.'/videos', [
            'upload_id' => $uploadId,
            'original_name' => 'tour.mp4',
            'duration_sec' => 40,
        ])->assertCreated();

        $video = CompanyVideo::findOrFail($res->json('data.id'));
        Storage::disk('public')->assertExists($video->video_path);
        $this->assertSame(strlen($data), strlen(Storage::disk('public')->get($video->video_path)));
        $this->assertDirectoryDoesNotExist(storage_path('app/video-chunks/'.$owner->id.'/'.$uploadId));
    }

    /** Regression: the pieces used to share the user's throttle counter, so saving failed with "Too Many Attempts". */
    public function test_many_pieces_do_not_block_saving_the_video(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create(['role' => 'seller']);
        $listing = Product::factory()->create(['user_id' => $owner->id, 'status' => 'published', 'moderation_status' => 'approved']);
        $uploadId = (string) Str::uuid();

        $this->sendInChunks($owner, $this->fakeMp4(80 * 2048), $uploadId, 2048); // 80 pieces

        $this->as($owner)->postJson('/api/v1/products/'.$listing->id.'/videos', ['upload_id' => $uploadId, 'duration_sec' => 30])
            ->assertCreated();
        // Other limited actions (likes, views…) still work right after.
        $video = CompanyVideo::query()->latest('id')->firstOrFail();
        $this->as($owner)->postJson('/api/v1/videos/'.$video->id.'/like')->assertOk();
    }

    public function test_incomplete_or_wrong_uploads_are_rejected(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create(['role' => 'seller']);
        $listing = Product::factory()->create(['user_id' => $owner->id, 'status' => 'published', 'moderation_status' => 'approved']);

        // Missing a piece.
        $uploadId = (string) Str::uuid();
        $this->as($owner)->post('/api/v1/uploads/video-chunks', [
            'upload_id' => $uploadId, 'index' => 0, 'total' => 2,
            'chunk' => UploadedFile::fake()->createWithContent('part', $this->fakeMp4(1024)),
        ], ['Accept' => 'application/json'])->assertOk();
        $this->as($owner)->postJson('/api/v1/products/'.$listing->id.'/videos', ['upload_id' => $uploadId])
            ->assertStatus(422)->assertJsonValidationErrors('video');

        // Not a video.
        $uploadId = (string) Str::uuid();
        $this->sendInChunks($owner, str_repeat('not a video ', 1000), $uploadId);
        $this->as($owner)->postJson('/api/v1/products/'.$listing->id.'/videos', ['upload_id' => $uploadId])
            ->assertStatus(422)->assertJsonValidationErrors('video');

        // Bad id.
        $this->as($owner)->post('/api/v1/uploads/video-chunks', [
            'upload_id' => '../../etc', 'index' => 0, 'total' => 1,
            'chunk' => UploadedFile::fake()->createWithContent('part', 'x'),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }
}
