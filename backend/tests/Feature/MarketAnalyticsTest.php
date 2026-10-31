<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use App\Services\Analytics\AnalyticsAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Market analytics: daily aggregation (idempotent, late events, sales from orders), 75-day retention of
 * raw events, and reports that keep working for past years after the raw events are deleted.
 */
class MarketAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private City $riyadh;

    private City $jeddah;

    protected function setUp(): void
    {
        parent::setUp();
        config(['analytics.timezone' => 'Asia/Riyadh', 'analytics.raw_retention_days' => 75, 'analytics.retention_enabled' => false]);
        $this->travelTo(CarbonImmutable::parse('2029-03-15 12:00:00', 'Asia/Riyadh'));
        $this->riyadh = City::factory()->create();
        $this->jeddah = City::factory()->create();
    }

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    private function product(City $city, array $extra = []): Product
    {
        return Product::factory()->create(array_merge(['city_id' => $city->id, 'status' => 'published', 'moderation_status' => 'approved'], $extra));
    }

    /** A raw view at a Saudi local time. */
    /** @var array<int, int> test visitor number → real user id */
    private array $visitors = [];

    private function pageView(Product $p, string $localTime, ?int $visitorId = null, string $ip = '10.0.0.1'): void
    {
        if ($visitorId !== null) {
            $this->visitors[$visitorId] ??= User::factory()->create()->id;
        }
        DB::table('page_visits')->insert([
            'product_id' => $p->id,
            'profile_id' => $p->user_id,
            'visitor_id' => $visitorId !== null ? $this->visitors[$visitorId] : null,
            'ip_address' => $ip,
            'created_at' => CarbonImmutable::parse($localTime, 'Asia/Riyadh')->utc(),
        ]);
    }

    private function order(Product $p, string $status, float $amount, string $localTime): Purchase
    {
        $o = Purchase::query()->create([
            'product_id' => $p->id, 'buyer_id' => User::factory()->create()->id, 'seller_id' => $p->user_id,
            'amount' => $amount, 'quantity' => 1, 'payment_method' => 'cash', 'status' => $status,
        ]);
        $o->forceFill(['created_at' => CarbonImmutable::parse($localTime, 'Asia/Riyadh')->utc()])->saveQuietly();

        return $o;
    }

    public function test_aggregation_counts_views_and_sales_correctly_and_rerunning_never_double_counts(): void
    {
        $a = $this->product($this->riyadh);
        $b = $this->product($this->jeddah);
        $this->pageView($a, '2029-03-14 10:00', 7);
        $this->pageView($a, '2029-03-14 11:00', 7);           // same member twice → 1 unique
        $this->pageView($a, '2029-03-14 23:30', null, '1.1.1.1');
        $this->pageView($b, '2029-03-14 09:00', null, '2.2.2.2');
        $this->pageView($a, '2029-03-15 00:10', 9);            // Saudi next day
        $this->order($a, 'completed', 500, '2029-03-14 12:00');
        $this->order($a, 'pending', 900, '2029-03-14 13:00');   // not a sale
        $this->order($b, 'cancelled', 300, '2029-03-14 14:00');

        $agg = app(AnalyticsAggregator::class);
        $agg->aggregateDay('2029-03-14');
        $agg->aggregateDay('2029-03-14'); // again — must not double count

        $pa = DB::table('analytics_daily_product_views')->where('date', '2029-03-14')->where('product_id', $a->id)->first();
        $this->assertSame(3, (int) $pa->views);
        $this->assertSame(2, (int) $pa->unique_viewers);
        $total = DB::table('analytics_daily_market_stats')->where('date', '2029-03-14')->where('city_id', 0)->where('category_id', 0)->first();
        $this->assertSame(4, (int) $total->views);
        $this->assertSame(3, (int) $total->orders);
        $this->assertSame(1, (int) $total->completed_orders);
        $this->assertSame(1, (int) $total->cancelled_orders);
        $this->assertEquals(500, (float) $total->completed_revenue);
        $riyadh = DB::table('analytics_daily_market_stats')->where('date', '2029-03-14')->where('city_id', $this->riyadh->id)->where('category_id', 0)->first();
        $this->assertSame(3, (int) $riyadh->views);

        // A late event for that day is picked up by re-running, counted once.
        $this->pageView($b, '2029-03-14 22:00', null, '3.3.3.3');
        $agg->aggregateDay('2029-03-14');
        $this->assertSame(5, (int) DB::table('analytics_daily_market_stats')->where('date', '2029-03-14')->where('city_id', 0)->where('category_id', 0)->value('views'));
    }

    public function test_an_order_completed_later_updates_the_day_it_was_placed(): void
    {
        $p = $this->product($this->riyadh);
        $o = $this->order($p, 'pending', 700, '2029-01-10 12:00');
        $this->artisan('analytics:aggregate', ['--from' => '2029-01-10', '--to' => '2029-01-10'])->assertSuccessful();
        $this->assertSame(0, (int) DB::table('analytics_daily_market_stats')->where('date', '2029-01-10')->where('city_id', 0)->where('category_id', 0)->value('completed_orders'));

        $o->update(['status' => 'completed']);
        $this->artisan('analytics:aggregate')->assertSuccessful(); // routine run: recent days + changed sales

        $row = DB::table('analytics_daily_market_stats')->where('date', '2029-01-10')->where('city_id', 0)->where('category_id', 0)->first();
        $this->assertSame(1, (int) $row->completed_orders);
        $this->assertEquals(700, (float) $row->completed_revenue);
    }

    public function test_retention_deletes_only_old_raw_events_and_history_survives_in_reports(): void
    {
        $sold = $this->product($this->riyadh, ['title' => 'شقة الملقا']);
        $other = $this->product($this->jeddah);
        // Last year (2028): raw events that will expire.
        $this->pageView($sold, '2028-06-01 10:00', 1);
        $this->pageView($sold, '2028-06-02 10:00', 2);
        $this->pageView($other, '2028-06-02 11:00', 3);
        $this->order($sold, 'completed', 1200, '2028-06-02 12:00');
        // Recent: must stay.
        $this->pageView($other, '2029-03-10 10:00', 4);
        DB::table('visitors')->insert(['path' => '/', 'created_at' => CarbonImmutable::parse('2028-06-01', 'Asia/Riyadh')->utc(), 'updated_at' => now()]);

        // Disabled by default: nothing deleted. Dry-run reports and deletes nothing.
        $this->artisan('analytics:prune')->assertSuccessful();
        $this->artisan('analytics:prune', ['--dry-run' => true])->assertSuccessful();
        $this->assertSame(4, DB::table('page_visits')->count());

        config(['analytics.retention_enabled' => true]);
        $this->artisan('analytics:prune')->assertSuccessful();   // aggregates the old days first, then deletes
        $this->artisan('analytics:prune')->assertSuccessful();   // safe to repeat

        $this->assertSame(1, DB::table('page_visits')->count());          // only the recent view remains
        $this->assertSame(0, DB::table('visitors')->count());
        $this->assertSame(1, Purchase::query()->count());                  // business records untouched
        $this->assertNotNull(Product::find($sold->id));

        // The listing is deleted later — its history still shows (snapshot title).
        $sold->delete();

        $admin = User::factory()->create(['role' => 'super_admin']);
        $data = $this->as($admin)->getJson('/api/v1/admin/market-analytics?from=2028-01-01&to=2028-12-31')->assertOk()->json('data');
        $this->assertSame(3, $data['summary']['views']);
        $this->assertSame(1, $data['summary']['completed_orders']);
        $this->assertEquals(1200, $data['summary']['completed_revenue']);
        $this->assertSame('شقة الملقا', $data['products']['most_viewed'][0]['title']);
        $this->assertSame(2, $data['products']['most_viewed'][0]['views']);
        $this->assertSame($this->riyadh->id, $data['cities']['rows'][0]['id']);
        $this->assertSame('month', $data['trend']['granularity']);

        // A full backfill now covers days whose raw events are gone: their stored totals must survive.
        $this->artisan('analytics:aggregate', ['--all' => true])->assertSuccessful();
        $this->assertSame(3, $this->as($admin)->getJson('/api/v1/admin/market-analytics?from=2028-01-01&to=2028-12-31')->json('data.summary.views'));

        // Previous-period comparison: 2029 so far vs the same length before.
        $cmp = $this->as($admin)->getJson('/api/v1/admin/market-analytics?from=2029-03-10&to=2029-03-10')->json('data');
        $this->assertSame(1, $cmp['summary']['views']);
        $this->assertSame('2029-03-09', $cmp['previous_period']['from']);

        // Non-admins can't read it.
        $this->as(User::factory()->create(['role' => 'seller']))->getJson('/api/v1/admin/market-analytics')->assertForbidden();
    }

    public function test_searches_are_recorded_without_personal_data_and_aggregated(): void
    {
        $p = $this->product($this->riyadh, ['title' => 'فيلا للبيع']);
        $this->getJson('/api/v1/listings?search=فيلا')->assertOk();
        $this->getJson('/api/v1/listings?search=فيلا&page=2')->assertOk();      // paging isn't a new search
        $this->getJson('/api/v1/listings?search=قصر%20ملكي')->assertOk();        // no results
        $this->getJson('/api/v1/listings?search=0551234567')->assertOk();        // phone number → not stored

        $this->assertSame(2, DB::table('analytics_search_events')->count());
        $this->assertSame(0, DB::table('analytics_search_events')->where('term', 'like', '%055%')->count());

        app(AnalyticsAggregator::class)->aggregateDay(CarbonImmutable::now('Asia/Riyadh')->toDateString());
        $admin = User::factory()->create(['role' => 'super_admin']);
        $search = $this->as($admin)->getJson('/api/v1/admin/market-analytics?from=2029-03-15&to=2029-03-15')->json('data.search');
        $this->assertEqualsCanonicalizing(['فيلا', 'قصر ملكي'], array_column($search['top_terms'], 'term'));
        $this->assertSame(['قصر ملكي'], array_column($search['zero_result_terms'], 'term'));
    }
}
