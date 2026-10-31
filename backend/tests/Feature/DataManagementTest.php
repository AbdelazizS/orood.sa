<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\CompanyVideo;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Admin «إدارة البيانات»: retention settings, preview → confirmed deletion of analytics details
 * (aggregates survive and are never rebuilt from empty tables) and of videos by period and scope.
 */
class DataManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        config(['analytics.timezone' => 'Asia/Riyadh', 'analytics.raw_retention_days' => 75, 'analytics.retention_enabled' => false]);
        $this->travelTo(CarbonImmutable::parse('2029-03-15 12:00:00', 'Asia/Riyadh'));
        Storage::fake('public');
        $this->admin = User::factory()->create(['role' => 'super_admin']);
    }

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    private function product(array $extra = []): Product
    {
        return Product::factory()->create(array_merge(['city_id' => City::factory()->create()->id, 'status' => 'published', 'moderation_status' => 'approved'], $extra));
    }

    private function pageView(Product $p, string $localTime): void
    {
        DB::table('page_visits')->insert([
            'product_id' => $p->id, 'profile_id' => $p->user_id, 'ip_address' => '10.0.0.1',
            'created_at' => CarbonImmutable::parse($localTime, 'Asia/Riyadh')->utc(),
        ]);
    }

    private function video(Product $p, string $localTime, string $status = CompanyVideo::STATUS_PUBLISHED): CompanyVideo
    {
        $path = 'videos/'.uniqid().'.mp4';
        $thumb = 'videos/thumbs/'.uniqid().'.jpg';
        Storage::disk('public')->put($path, 'video');
        Storage::disk('public')->put($thumb, 'thumb');
        $v = CompanyVideo::query()->create([
            'user_id' => $p->user_id, 'product_id' => $p->id, 'title' => 'v', 'video_path' => $path,
            'thumbnail_url' => '/storage/'.$thumb, 'status' => $status, 'published_at' => now(),
        ]);
        $v->forceFill(['file_size_kb' => 2048, 'created_at' => CarbonImmutable::parse($localTime, 'Asia/Riyadh')->utc()])->saveQuietly();

        return $v;
    }

    public function test_settings_are_saved_and_drive_the_scheduled_cleanup(): void
    {
        $this->as($this->admin)->putJson('/api/v1/admin/data-management/settings', ['auto_enabled' => true, 'raw_days' => 60])
            ->assertOk()->assertJsonPath('data.raw_days', 60)->assertJsonPath('data.auto_enabled', true);
        $this->as($this->admin)->putJson('/api/v1/admin/data-management/settings', ['raw_days' => 5])->assertUnprocessable();

        $p = $this->product();
        $this->pageView($p, '2029-01-01 10:00'); // older than 30 days (minimum) → deleted
        $this->pageView($p, '2029-03-14 10:00');
        $this->as($this->admin)->putJson('/api/v1/admin/data-management/settings', ['raw_days' => 30])->assertOk();
        $this->artisan('analytics:prune')->assertSuccessful();
        $this->assertSame(1, DB::table('page_visits')->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'data_retention.settings_updated']);
    }

    public function test_analytics_details_are_deleted_by_period_after_preview_and_confirmation_and_numbers_survive(): void
    {
        $p = $this->product();
        $this->pageView($p, '2029-03-01 10:00');
        $this->pageView($p, '2029-03-01 11:00');
        $this->pageView($p, '2029-03-14 10:00'); // within the last days → never touched
        $this->artisan('analytics:aggregate', ['--from' => '2029-03-01', '--to' => '2029-03-15'])->assertSuccessful();

        $body = ['target' => 'analytics', 'mode' => 'older_than', 'older_than_days' => 7];
        $preview = $this->as($this->admin)->postJson('/api/v1/admin/data-management/preview', $body)->assertOk()->json('data');
        $this->assertSame(2, $preview['tables']['page_visits']);
        $this->assertSame(3, DB::table('page_visits')->count()); // preview deletes nothing

        $this->as($this->admin)->postJson('/api/v1/admin/data-management/execute', $body + ['confirm' => 'نعم'])->assertUnprocessable();
        $this->as($this->admin)->postJson('/api/v1/admin/data-management/execute', $body + ['confirm' => 'حذف'])
            ->assertOk()->assertJsonPath('data.tables.page_visits', 2);
        $this->assertSame(1, DB::table('page_visits')->count());

        // The day is inside the 75-day window, but rebuilding must not wipe its numbers.
        $this->artisan('analytics:aggregate', ['--from' => '2029-03-01', '--to' => '2029-03-01'])->assertSuccessful();
        $this->assertSame(2, (int) DB::table('analytics_daily_market_stats')->where('date', '2029-03-01')->where('city_id', 0)->where('category_id', 0)->value('views'));

        $runs = $this->as($this->admin)->getJson('/api/v1/admin/data-management')->assertOk()->json('data.runs');
        $this->assertSame('data-analytics', $runs[0]['job']);
        $this->assertSame($this->admin->id, $runs[0]['actor']['id']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'data_cleanup.analytics', 'user_id' => $this->admin->id]);
    }

    public function test_recent_analytics_days_cannot_be_deleted(): void
    {
        $this->as($this->admin)->postJson('/api/v1/admin/data-management/preview', [
            'target' => 'analytics', 'mode' => 'range', 'from' => '2029-03-10', 'to' => '2029-03-15',
        ])->assertUnprocessable()->assertJsonValidationErrors('to');
    }

    public function test_videos_are_deleted_by_scope_with_files_and_map_display_reverts(): void
    {
        $sold = $this->product(['status' => 'sold', 'map_display' => 'video']);
        $live = $this->product(['map_display' => 'video']);
        $soldVideo = $this->video($sold, '2028-12-01 10:00');
        $liveVideo = $this->video($live, '2028-12-01 10:00');
        $hidden = $this->video($live, '2028-12-02 10:00', CompanyVideo::STATUS_HIDDEN);
        $recentSold = $this->video($sold, '2029-03-14 10:00'); // newer than a month

        $body = ['target' => 'videos', 'mode' => 'older_than', 'older_than_days' => 30, 'scope' => 'inactive_listings'];
        $preview = $this->as($this->admin)->postJson('/api/v1/admin/data-management/preview', $body)->assertOk()->json('data');
        $this->assertSame(2, $preview['count']); // sold listing's old video + hidden one
        $this->assertSame(4096, $preview['size_kb']);

        $this->as($this->admin)->postJson('/api/v1/admin/data-management/execute', $body + ['confirm' => 'حذف'])
            ->assertOk()->assertJsonPath('data.deleted', 2)->assertJsonPath('data.files_deleted', 4);
        $this->assertModelMissing($soldVideo);
        $this->assertModelMissing($hidden);
        $this->assertModelExists($liveVideo);
        $this->assertModelExists($recentSold);
        Storage::disk('public')->assertMissing($soldVideo->video_path);
        Storage::disk('public')->assertExists($liveVideo->video_path);

        // "all" removes live-listing videos too; the listing falls back to its price on the map.
        $this->as($this->admin)->postJson('/api/v1/admin/data-management/execute', ['scope' => 'all', 'confirm' => 'حذف'] + $body)
            ->assertOk()->assertJsonPath('data.deleted', 1);
        $this->assertSame('price', $live->fresh()->map_display);
    }

    public function test_only_admins_with_permission_can_use_it(): void
    {
        $this->as(User::factory()->create(['role' => 'seller']))->getJson('/api/v1/admin/data-management')->assertForbidden();
        $this->as($this->admin)->getJson('/api/v1/admin/data-management')->assertOk()
            ->assertJsonStructure(['data' => ['settings' => ['auto_enabled', 'raw_days'], 'analytics' => ['tables'], 'videos' => ['count', 'size_kb'], 'runs']]);
    }
}
