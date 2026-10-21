<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Company;
use App\Models\CompanyVideo;
use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductRealEstateDetail;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Details from the client PDF screenshots/annotations (notes 1–4) beyond the main flows.
 */
class PdfNotesCompletionTest extends TestCase
{
    use RefreshDatabase;

    private Category $realEstate;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config(['subscribers.ad_days' => 30, 'subscribers.ad_price_sar' => 100]);
        $this->realEstate = Category::query()->where('slug', 'real-estate')->first()
            ?? Category::factory()->create(['slug' => 'real-estate']);
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

    private function awaiting(array $overrides = []): Product
    {
        $p = Product::factory()->create(array_merge([
            'status' => 'published',
            'moderation_status' => 'approved',
            'marketing_status' => Product::MARKETING_AWAITING,
            'category_id' => $this->realEstate->id,
            'city_id' => City::factory()->create()->id,
            'location_lat' => 24.7,
            'location_lng' => 46.6,
            'is_wholesale' => false,
            'price' => 1200000,
        ], $overrides));
        ProductRealEstateDetail::query()->create(['product_id' => $p->id, 'purpose' => 'sale', 'property_type' => 'land', 'area_sqm' => 600]);

        return $p;
    }

    /** Subscriber created by admin with a 10-ad package paid 800 SAR. */
    private function subscriber(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $id = $this->as($admin)->postJson('/api/v1/admin/subscribers', [
            'name' => 'مسوق', 'email' => 'm'.uniqid().'@example.com', 'credits' => 10, 'amount_sar' => 800,
        ])->assertCreated()->json('data.id');

        return User::findOrFail($id);
    }

    public function test_awaiting_listing_shows_price_per_meter_but_not_total(): void
    {
        $p = $this->awaiting();

        $this->guest()->getJson('/api/v1/products/'.$p->id)
            ->assertOk()
            ->assertJsonPath('data.price', null)
            ->assertJsonPath('data.price_per_sqm', 2000);
    }

    public function test_ad_runs_for_configured_days_then_expires_and_can_be_bought_again(): void
    {
        $sub = $this->subscriber();
        $p = $this->awaiting();

        $this->as($sub)->postJson("/api/v1/subscriber/products/{$p->id}/buy")->assertCreated();
        $row = SubscriberListing::query()->where('product_id', $p->id)->firstOrFail();
        $this->assertEqualsWithDelta(now()->addDays(30)->timestamp, $row->expires_at->timestamp, 5);

        $this->as($sub)->getJson('/api/v1/subscriber/my-listings')
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonPath('data.0.days_left', 30);

        $this->travel(31)->days();
        $this->artisan('subscribers:expire-ads')->assertSuccessful();

        $this->assertSame('expired', $row->fresh()->status);
        $this->assertSame(Product::MARKETING_AWAITING, $p->fresh()->marketing_status, 'back on the market');
        $this->assertTrue(Notification::query()->where('user_id', $sub->id)->where('type', 'subscriber_ad_expired')->exists());
        $this->as($sub)->getJson('/api/v1/subscriber/overview')->assertJsonPath('data.expired_count', 1);

        // Another subscriber can buy it now; the expired ad stays in history.
        $other = $this->subscriber();
        $this->as($other)->postJson("/api/v1/subscriber/products/{$p->id}/buy")->assertCreated();
        $this->assertSame(2, SubscriberListing::query()->where('product_id', $p->id)->count());
    }

    public function test_cancel_at_owner_request_with_refund_and_money_figures(): void
    {
        $sub = $this->subscriber();
        $p = $this->awaiting();
        $this->as($sub)->postJson("/api/v1/subscriber/products/{$p->id}/buy")->assertCreated();
        $row = SubscriberListing::query()->where('product_id', $p->id)->firstOrFail();

        // 800 SAR for 10 ads → one ad = 80 SAR.
        $this->as($sub)->getJson('/api/v1/subscriber/overview')
            ->assertJsonPath('data.amount_paid_sar', 800)
            ->assertJsonPath('data.amount_used_sar', 80)
            ->assertJsonPath('data.amount_remaining_sar', 720);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->as($admin)->postJson("/api/v1/admin/subscriber-listings/{$row->id}/cancel", ['refund' => true, 'reason' => 'المالك باع العقار بنفسه'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.refunded', true);

        $this->assertSame('archived', $p->fresh()->status);
        $this->assertSame(10, $sub->fresh()->adCreditsBalance(), 'the ad came back');
        $this->as($sub)->getJson('/api/v1/subscriber/overview')
            ->assertJsonPath('data.cancelled_count', 1)
            ->assertJsonPath('data.amount_refunded_sar', 80)
            ->assertJsonPath('data.amount_remaining_sar', 800);

        // Can't cancel twice; employees can't cancel (manage permission only).
        $this->as($admin)->postJson("/api/v1/admin/subscriber-listings/{$row->id}/cancel", ['refund' => true])->assertStatus(422);
        $this->as(User::factory()->create(['role' => 'employee']))
            ->postJson("/api/v1/admin/subscriber-listings/{$row->id}/cancel", ['refund' => false])->assertForbidden();
    }

    public function test_subscriber_marks_sold(): void
    {
        $sub = $this->subscriber();
        $p = $this->awaiting();
        $this->as($sub)->postJson("/api/v1/subscriber/products/{$p->id}/buy")->assertCreated();
        $row = SubscriberListing::query()->where('product_id', $p->id)->firstOrFail();

        $this->as($this->subscriber())->postJson("/api/v1/subscriber/listings/{$row->id}/sold")->assertForbidden();
        $this->as($sub)->postJson("/api/v1/subscriber/listings/{$row->id}/sold")->assertOk()->assertJsonPath('data.status', 'sold');

        $this->assertSame('sold', $p->fresh()->status);
        $this->as($sub)->getJson('/api/v1/subscriber/overview')->assertJsonPath('data.sold_count', 1);
    }

    public function test_company_registers_with_activities(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $city = City::factory()->create();

        $this->as($user)->postJson('/api/v1/auth/register/company', [
            'company_name' => 'شركة المطور',
            'city_id' => $city->id,
            'category_id' => $this->realEstate->id,
            'activities' => ['developer', 'seller'],
        ])->assertSuccessful();

        $this->assertSame(['developer', 'seller'], Company::query()->where('user_id', $user->id)->firstOrFail()->activities);

        $this->as(User::factory()->create(['role' => 'buyer']))->postJson('/api/v1/auth/register/company', [
            'company_name' => 'x',
            'city_id' => $city->id,
            'category_id' => $this->realEstate->id,
            'activities' => ['pilot'],
        ])->assertStatus(422);
    }

    public function test_listing_page_videos_and_homepage_shorts(): void
    {
        $owner = User::factory()->create(['role' => 'company']);
        $company = Company::factory()->create(['user_id' => $owner->id, 'verification_status' => 'approved']);
        $listing = Product::factory()->create(['user_id' => $owner->id, 'status' => 'published', 'moderation_status' => 'approved']);
        $make = fn (array $o) => CompanyVideo::create(array_merge([
            'company_id' => $company->id, 'user_id' => $owner->id, 'title' => 'v', 'video_url' => 'https://example.com/v.mp4',
            'status' => 'published', 'published_at' => now(),
        ], $o));
        $linked = $make(['product_id' => $listing->id]);
        $make(['product_id' => $listing->id, 'status' => 'hidden']);
        $short = $make(['is_short' => true]);

        $this->guest()->getJson("/api/v1/products/{$listing->id}/videos")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $linked->id);
        $this->getJson('/api/v1/videos/shorts/latest')->assertOk()->assertJsonPath('data.0.id', $short->id);
    }

    public function test_rega_ad_license_optional_by_default_required_when_enabled(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $sub = \App\Models\Subcategory::query()->where('category_id', $this->realEstate->id)->first()
            ?? \App\Models\Subcategory::factory()->create(['category_id' => $this->realEstate->id]);
        $payload = [
            'type' => 'offer',
            'title' => 'أرض للبيع',
            'description' => 'وصف',
            'price' => 900000,
            'category_id' => $this->realEstate->id,
            'subcategory_id' => $sub->id,
            'image_urls' => ['https://example.com/a.jpg'],
            'contact_messages' => true,
            'location_lat' => 24.7,
            'location_lng' => 46.6,
            'real_estate' => ['purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400],
            'listing_attributes' => ['purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400],
        ];

        $id = $this->as($seller)->postJson('/api/v1/products', $payload + ['ad_license_no' => '7200123456'])->assertCreated()->json('data.id');
        $this->guest()->getJson('/api/v1/products/'.$id)->assertJsonPath('data.ad_license_no', '7200123456');

        config(['listings.require_ad_license' => true]);
        $this->as($seller)->postJson('/api/v1/products', $payload)->assertStatus(422)->assertJsonValidationErrors('ad_license_no');
        $this->as($seller)->postJson('/api/v1/products', $payload + ['ad_license_no' => 'bad license!'])->assertStatus(422);
        $this->as($seller)->postJson('/api/v1/products', $payload + ['ad_license_no' => '7200999999'])->assertCreated();
    }

    public function test_company_fal_license_on_registration_and_profile(): void
    {
        $user = User::factory()->create(['role' => 'buyer', 'username' => 'fal_co']);
        $this->as($user)->postJson('/api/v1/auth/register/company', [
            'company_name' => 'مكتب فال',
            'city_id' => City::factory()->create()->id,
            'category_id' => $this->realEstate->id,
            'activities' => ['marketer'],
            'fal_license_no' => '1100012345',
        ])->assertSuccessful();

        $this->guest()->getJson('/api/v1/profile/fal_co')->assertOk()->assertJsonPath('company.fal_license_no', '1100012345');

        $this->as($user->fresh())->putJson('/api/v1/company/activities', ['activities' => ['marketer'], 'fal_license_no' => '1100099999'])
            ->assertOk()
            ->assertJsonPath('data.fal_license_no', '1100099999');
    }

    public function test_page_visit_tracking_no_longer_fails(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'username' => 'visit_me']);
        $this->guest()->getJson('/api/v1/profile/visit_me')->assertOk();
        $this->assertDatabaseHas('page_visits', ['profile_id' => $seller->id]);
    }
}
