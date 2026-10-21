<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\CompanyVideo;
use App\Models\Notification;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompanyVideoChannelTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        Storage::fake('public');
        $this->owner = User::factory()->create(['role' => 'company', 'username' => 'rakaez']);
        $this->company = Company::factory()->create([
            'user_id' => $this->owner->id,
            'name' => 'مكتب ركائز العقارية',
            'verification_status' => 'approved',
        ]);
    }

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    private function guest()
    {
        $this->app['auth']->forgetGuards();

        return $this->withoutHeader('Authorization');
    }

    /** A real 1x1 PNG (the test machine has no GD for fake images). */
    private function tinyPng(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'thumb').'.png';
        file_put_contents($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='));

        return new UploadedFile($path, 'thumb.png', 'image/png', null, true);
    }

    private function video(array $overrides = []): CompanyVideo
    {
        return CompanyVideo::create(array_merge([
            'company_id' => $this->company->id,
            'user_id' => $this->owner->id,
            'title' => 'جولة في فيلا النرجس',
            'description' => 'وصف الفيديو',
            'video_url' => 'https://example.com/v.mp4',
            'duration_sec' => 300,
            'is_short' => false,
            'status' => 'published',
            'published_at' => now(),
        ], $overrides));
    }

    public function test_company_uploads_video_with_thumbnail_and_short_detection(): void
    {
        $listing = Product::factory()->create(['user_id' => $this->owner->id]);

        $res = $this->as($this->owner)->post('/api/v1/company/videos', [
            'video' => UploadedFile::fake()->create('tour.mp4', 2048, 'video/mp4'),
            'thumbnail' => $this->tinyPng(),
            'title' => 'جولة داخل الفيلا',
            'description' => 'تفاصيل الفيلا',
            'duration_sec' => 45,
            'product_id' => $listing->id,
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertTrue($res->json('data.is_short'), '45s with no explicit flag → Short');
        $this->assertStringStartsWith('/storage/company-videos/'.$this->company->id.'/', $res->json('data.url'));
        $this->assertSame($listing->id, $res->json('data.product.id'));
        $video = CompanyVideo::findOrFail($res->json('data.id'));
        Storage::disk('public')->assertExists($video->video_path);

        // Can't link another seller's listing; wrong type / too big are rejected.
        $other = Product::factory()->create();
        $this->as($this->owner)->post('/api/v1/company/videos', [
            'video' => UploadedFile::fake()->create('a.mp4', 100, 'video/mp4'),
            'title' => 'x',
            'product_id' => $other->id,
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('product_id');
        $this->as($this->owner)->post('/api/v1/company/videos', [
            'video' => UploadedFile::fake()->create('a.pdf', 100, 'application/pdf'),
            'title' => 'x',
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('video');
        config(['videos.max_kb' => 500]);
        $this->as($this->owner)->post('/api/v1/company/videos', [
            'video' => UploadedFile::fake()->create('big.mp4', 900, 'video/mp4'),
            'title' => 'x',
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('video');

        // Non-company accounts can't upload.
        $this->as(User::factory()->create(['role' => 'seller']))->post('/api/v1/company/videos', [
            'video' => UploadedFile::fake()->create('a.mp4', 100, 'video/mp4'),
            'title' => 'x',
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_channel_lists_published_videos_split_into_shorts_and_long(): void
    {
        $long = $this->video();
        $short = $this->video(['title' => 'Short', 'is_short' => true, 'duration_sec' => 30]);
        $this->video(['title' => 'Hidden', 'status' => 'hidden']);

        $res = $this->guest()->getJson("/api/v1/companies/{$this->company->id}/videos")->assertOk();
        $this->assertEqualsCanonicalizing([$long->id, $short->id], collect($res->json('data'))->pluck('id')->all());
        $this->assertSame(1, $res->json('meta.shorts_count'));
        $this->assertSame(1, $res->json('meta.long_count'));

        $this->assertSame([$short->id], collect($this->getJson("/api/v1/companies/{$this->company->id}/videos?type=short")->json('data'))->pluck('id')->all());
        $this->assertSame([$long->id], collect($this->getJson("/api/v1/companies/{$this->company->id}/videos?type=long")->json('data'))->pluck('id')->all());

        // Profile payload exposes the channel counts + activities.
        $this->company->update(['activities' => ['marketer', 'developer']]);
        $this->getJson('/api/v1/profile/rakaez')
            ->assertOk()
            ->assertJsonPath('company.activities', ['marketer', 'developer'])
            ->assertJsonPath('company.videos_count', 1)
            ->assertJsonPath('company.shorts_count', 1);
    }

    public function test_hidden_video_is_404_for_public_but_visible_to_owner(): void
    {
        $hidden = $this->video(['status' => 'hidden']);

        $this->guest()->getJson("/api/v1/videos/{$hidden->id}")->assertNotFound();
        $this->as($this->owner)->getJson("/api/v1/videos/{$hidden->id}")->assertOk()->assertJsonPath('data.is_owner', true);
    }

    public function test_views_are_counted_once_per_viewer_and_likes_toggle(): void
    {
        $video = $this->video();
        $viewer = User::factory()->create(['role' => 'buyer']);

        $this->guest()->postJson("/api/v1/videos/{$video->id}/view")->assertOk()->assertJsonPath('data.views_count', 1);
        $this->guest()->postJson("/api/v1/videos/{$video->id}/view")->assertJsonPath('data.views_count', 1);
        $this->as($viewer)->postJson("/api/v1/videos/{$video->id}/view")->assertJsonPath('data.views_count', 2);

        $this->as($viewer)->postJson("/api/v1/videos/{$video->id}/like")->assertJsonPath('data.liked', true)->assertJsonPath('data.likes_count', 1);
        $this->as($viewer)->getJson("/api/v1/videos/{$video->id}")->assertJsonPath('data.liked_by_me', true);
        $this->as($viewer)->postJson("/api/v1/videos/{$video->id}/like")->assertJsonPath('data.liked', false)->assertJsonPath('data.likes_count', 0);
        $this->guest()->postJson("/api/v1/videos/{$video->id}/like")->assertUnauthorized();
    }

    public function test_comments_replies_timestamps_and_owner_tools(): void
    {
        $video = $this->video();
        $alice = User::factory()->create(['role' => 'buyer', 'name' => 'Alice']);
        $bob = User::factory()->create(['role' => 'buyer', 'name' => 'Bob']);

        $c1 = $this->as($alice)->postJson("/api/v1/videos/{$video->id}/comments", ['body' => 'المطبخ عند 02:15 رائع', 'timestamp_sec' => 135])
            ->assertCreated()->json('data.id');
        $c2 = $this->as($bob)->postJson("/api/v1/videos/{$video->id}/comments", ['body' => 'كم السعر؟'])->json('data.id');

        // Owner is notified; a reply nests under the comment and notifies its author.
        $this->assertTrue(Notification::query()->where('user_id', $this->owner->id)->where('type', 'video_comment_new')->exists());
        $reply = $this->as($this->owner)->postJson("/api/v1/videos/{$video->id}/comments", ['body' => 'شكراً!', 'parent_id' => $c1])
            ->assertCreated()
            ->assertJsonPath('data.author.is_channel_owner', true)
            ->assertJsonPath('data.author.is_verified_company', true)
            ->json('data.id');
        $this->assertTrue(Notification::query()->where('user_id', $alice->id)->where('type', 'video_comment_reply')->exists());
        // Reply to a reply joins the same thread (one level).
        $this->as($bob)->postJson("/api/v1/videos/{$video->id}/comments", ['body' => 'وأنا كذلك', 'parent_id' => $reply])
            ->assertJsonPath('data.parent_id', $c1);

        // Pin + heart are owner-only.
        $this->as($bob)->postJson("/api/v1/video-comments/{$c2}/pin")->assertForbidden();
        $this->as($this->owner)->postJson("/api/v1/video-comments/{$c2}/pin")->assertJsonPath('data.is_pinned', true);
        $this->as($this->owner)->postJson("/api/v1/video-comments/{$c1}/heart")->assertJsonPath('data.owner_hearted', true);

        $list = $this->guest()->getJson("/api/v1/videos/{$video->id}/comments")->assertOk();
        $this->assertSame($c2, $list->json('data.0.id'), 'pinned comment first');
        $first = collect($list->json('data'))->firstWhere('id', $c1);
        $this->assertSame(135, $first['timestamp_sec']);
        $this->assertTrue($first['owner_hearted']);
        $this->assertCount(2, $first['replies']);
        $this->assertSame(4, $list->json('meta.comments_count'));

        // Pinning another comment unpins the previous one.
        $this->as($this->owner)->postJson("/api/v1/video-comments/{$c1}/pin")->assertJsonPath('data.is_pinned', true);
        $this->assertFalse((bool) \App\Models\CompanyVideoComment::find($c2)->is_pinned);

        // Comment likes toggle.
        $this->as($bob)->postJson("/api/v1/video-comments/{$c1}/like")->assertJsonPath('data.likes_count', 1);

        // Hide: gone for the public, still visible (flagged) for the owner.
        $this->as($this->owner)->postJson("/api/v1/video-comments/{$c2}/hide")->assertJsonPath('data.is_hidden', true);
        $this->assertNull(collect($this->guest()->getJson("/api/v1/videos/{$video->id}/comments")->json('data'))->firstWhere('id', $c2));
        $ownerView = collect($this->as($this->owner)->getJson("/api/v1/videos/{$video->id}/comments")->json('data'))->firstWhere('id', $c2);
        $this->assertTrue($ownerView['is_hidden']);

        // Delete: author or channel owner only.
        $this->as($alice)->deleteJson("/api/v1/video-comments/{$c2}")->assertForbidden();
        $this->as($bob)->deleteJson("/api/v1/video-comments/{$c2}")->assertOk();
    }

    public function test_owner_edits_hides_and_deletes_and_sets_activities(): void
    {
        $video = $this->video();
        $stranger = User::factory()->create(['role' => 'company']);

        $this->as($stranger)->putJson("/api/v1/company/videos/{$video->id}", ['title' => 'x'])->assertForbidden();
        $this->as($this->owner)->putJson("/api/v1/company/videos/{$video->id}", ['title' => 'عنوان جديد', 'status' => 'hidden'])
            ->assertOk()
            ->assertJsonPath('data.title', 'عنوان جديد')
            ->assertJsonPath('data.status', 'hidden');

        $this->as($this->owner)->putJson('/api/v1/company/activities', ['activities' => ['developer', 'seller'], 'description' => 'نبذة'])
            ->assertOk()
            ->assertJsonPath('data.activities', ['developer', 'seller']);
        $this->as($this->owner)->putJson('/api/v1/company/activities', ['activities' => ['astronaut']])->assertStatus(422);

        $this->as($this->owner)->getJson('/api/v1/company/videos')->assertOk()->assertJsonCount(1, 'data');
        $this->as($this->owner)->deleteJson("/api/v1/company/videos/{$video->id}")->assertOk();
        $this->assertNull(CompanyVideo::find($video->id));
    }

    public function test_admin_hides_video_and_owner_cannot_republish(): void
    {
        $video = $this->video();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->as($admin)->getJson('/api/v1/admin/company-videos')->assertOk()->assertJsonPath('data.0.id', $video->id);
        $this->as($admin)->patchJson("/api/v1/admin/company-videos/{$video->id}/status", ['status' => 'hidden', 'reason' => 'محتوى مخالف'])
            ->assertOk();
        $this->assertTrue(Notification::query()->where('user_id', $this->owner->id)->where('type', 'company_video_hidden')->exists());
        $this->guest()->getJson("/api/v1/videos/{$video->id}")->assertNotFound();

        $this->as($this->owner)->putJson("/api/v1/company/videos/{$video->id}", ['status' => 'published'])
            ->assertJsonPath('data.status', 'hidden');

        $this->as(User::factory()->create(['role' => 'seller']))->getJson('/api/v1/admin/company-videos')->assertForbidden();
    }

    public function test_subscriber_cannot_comment_on_videos(): void
    {
        $video = $this->video();
        $this->as(User::factory()->create(['role' => 'subscriber']))
            ->postJson("/api/v1/videos/{$video->id}/comments", ['body' => 'x'])
            ->assertForbidden();
    }
}
