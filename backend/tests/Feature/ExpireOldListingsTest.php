<?php

namespace Tests\Feature;

use App\Models\CompanyVideo;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Old listings expire (owner can renew); videos of long-expired listings are deleted. Off by default. */
class ExpireOldListingsTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    public function test_nothing_happens_until_the_days_are_configured(): void
    {
        config(['listings.expire_after_days' => null]);
        $old = Product::factory()->create(['status' => 'published', 'published_at' => now()->subYear(), 'bumped_at' => null]);

        $this->artisan('listings:expire-old')->assertSuccessful();

        $this->assertSame('published', $old->fresh()->status);
    }

    public function test_old_listings_expire_owner_renews_and_long_expired_videos_are_freed(): void
    {
        Storage::fake('public');
        config(['listings.expire_after_days' => 90, 'listings.expired_video_cleanup_days' => 30]);
        $owner = User::factory()->create(['role' => 'seller']);
        $old = Product::factory()->create(['user_id' => $owner->id, 'status' => 'published', 'moderation_status' => 'approved', 'published_at' => now()->subDays(120), 'bumped_at' => null]);
        $recent = Product::factory()->create(['status' => 'published', 'published_at' => now()->subDays(10)]);
        $bumped = Product::factory()->create(['status' => 'published', 'published_at' => now()->subDays(200), 'bumped_at' => now()->subDays(5)]);

        $this->artisan('listings:expire-old')->assertSuccessful();
        $this->assertSame('expired', $old->fresh()->status);
        $this->assertSame('published', $recent->fresh()->status);
        $this->assertSame('published', $bumped->fresh()->status);

        // Owner renews it from «إعلاناتي».
        $this->as($owner)->postJson('/api/v1/dashboard/listings/'.$old->id.'/bump')->assertOk();
        $this->assertSame('published', $old->fresh()->status);

        // Expired long ago with a listing video → the video file is removed.
        $stale = Product::factory()->create(['status' => 'expired', 'expired_at' => now()->subDays(40)]);
        Storage::disk('public')->put('listing-videos/'.$stale->id.'/v.mp4', 'x');
        $video = CompanyVideo::query()->create([
            'user_id' => $stale->user_id, 'product_id' => $stale->id, 'title' => 'v',
            'video_path' => 'listing-videos/'.$stale->id.'/v.mp4', 'status' => 'published', 'published_at' => now(),
        ]);
        $this->artisan('listings:expire-old')->assertSuccessful();
        Storage::disk('public')->assertMissing('listing-videos/'.$stale->id.'/v.mp4');
        $this->assertNull(CompanyVideo::find($video->id));
    }
}
