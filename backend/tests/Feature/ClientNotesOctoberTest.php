<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\CompanyVideo;
use App\Models\District;
use App\Models\Product;
use App\Models\ProductRealEstateDetail;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Client notes 2026-10: districts, price per metre, listing videos (all sections), video map/feed,
 * map position for every section, and the admin switch for the «سوق الجملة» button.
 */
class ClientNotesOctoberTest extends TestCase
{
    use RefreshDatabase;

    private Category $realEstate;

    private City $city;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->realEstate = Category::query()->where('slug', 'real-estate')->first()
            ?? Category::factory()->create(['slug' => 'real-estate']);
        $this->city = City::factory()->create(['lat' => 24.7136, 'lng' => 46.6753]);
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

    private function listing(array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'status' => 'published',
            'moderation_status' => 'approved',
            'is_wholesale' => false,
            'city_id' => $this->city->id,
            'location_lat' => null,
            'location_lng' => null,
        ], $overrides));
    }

    public function test_districts_endpoint_merges_curated_list_with_districts_used_by_listings(): void
    {
        District::query()->create(['city_id' => $this->city->id, 'name' => 'النرجس', 'sort_order' => 0]);
        District::query()->create(['city_id' => $this->city->id, 'name' => 'الملقا', 'sort_order' => 1]);
        $this->listing(['district' => 'حي جديد']);

        $names = $this->guest()->getJson('/api/v1/districts?city_id='.$this->city->id)->assertOk()->json('data');

        $this->assertSame(['النرجس', 'الملقا', 'حي جديد'], $names);
        $this->guest()->getJson('/api/v1/districts')->assertStatus(422);
    }

    public function test_feed_filters_by_district_and_flags_listings_with_a_video(): void
    {
        $inDistrict = $this->listing(['district' => 'النرجس']);
        $this->listing(['district' => 'الملقا']);
        CompanyVideo::query()->create([
            'user_id' => $inDistrict->user_id, 'product_id' => $inDistrict->id, 'title' => 'جولة',
            'video_url' => 'https://example.com/v.mp4', 'is_short' => true, 'status' => 'published', 'published_at' => now(),
        ]);

        $rows = $this->guest()->getJson('/api/v1/listings?city_id='.$this->city->id.'&district=النرجس')->assertOk()->json('data');
        $this->assertCount(1, $rows);
        $this->assertSame($inDistrict->id, $rows[0]['id']);
        $this->assertTrue($rows[0]['has_video']);

        $withVideo = $this->guest()->getJson('/api/v1/listings?has_video=1')->assertOk()->json('data');
        $this->assertSame([$inDistrict->id], array_column($withVideo, 'id'));
    }

    public function test_real_estate_offer_needs_price_and_price_per_meter_but_requests_and_other_sections_do_not(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $sub = Subcategory::query()->where('category_id', $this->realEstate->id)->first()
            ?? Subcategory::factory()->create(['category_id' => $this->realEstate->id]);
        $payload = [
            'type' => 'offer',
            'title' => 'فيلا للبيع',
            'description' => 'وصف',
            'category_id' => $this->realEstate->id,
            'subcategory_id' => $sub->id,
            'region_id' => $this->city->region_id,
            'city_id' => $this->city->id,
            'image_urls' => ['https://example.com/a.jpg'],
            'contact_messages' => true,
            'real_estate' => ['purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400],
            'listing_attributes' => ['purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400],
            'location_lat' => 24.81,
            'location_lng' => 46.62,
            'location_address' => 'النرجس، الرياض',
        ];

        // "على السوم" isn't accepted for real estate.
        $this->as($seller)->postJson('/api/v1/products', $payload)
            ->assertStatus(422)->assertJsonValidationErrors(['price', 'price_per_meter']);
        $this->as($seller)->postJson('/api/v1/products', $payload + ['price' => 1600000])
            ->assertStatus(422)->assertJsonValidationErrors('price_per_meter');

        $id = $this->as($seller)->postJson('/api/v1/products', $payload + ['price' => 1600000, 'price_per_meter' => 4000])
            ->assertCreated()->json('data.id');
        $this->assertEquals(4000, Product::findOrFail($id)->price_per_meter);

        // A real-estate request (طلب) can stay without a price.
        $this->as($seller)->postJson('/api/v1/products', array_merge($payload, ['type' => 'request']))->assertCreated();
    }

    public function test_awaiting_listing_hides_total_price_publicly_but_shows_price_per_meter(): void
    {
        $p = $this->listing([
            'category_id' => $this->realEstate->id,
            'price' => 2000000,
            'price_per_meter' => 5000,
            'marketing_status' => Product::MARKETING_AWAITING,
            'location_lat' => 24.8,
            'location_lng' => 46.6,
        ]);
        ProductRealEstateDetail::query()->create(['product_id' => $p->id, 'purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400]);

        $public = $this->guest()->getJson('/api/v1/listings/'.$p->id)->assertOk()->json('data');
        $this->assertNull($public['price']);
        $this->assertEquals(5000, $public['price_per_meter']);
        $this->assertSame(5000, $public['price_per_sqm']);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->assertEquals(2000000, $this->as($admin)->getJson('/api/v1/listings/'.$p->id)->json('data.price'));
    }

    public function test_listing_without_exact_location_is_placed_on_the_map_at_its_district_or_city_centre(): void
    {
        District::query()->create(['city_id' => $this->city->id, 'name' => 'النرجس', 'lat' => 24.8436, 'lng' => 46.6440]);
        $car = $this->listing(['district' => null]);
        $inDistrict = $this->listing(['district' => 'النرجس']);
        $exact = $this->listing(['location_lat' => 24.75, 'location_lng' => 46.70]);

        $this->assertEqualsWithDelta(24.7136, $car->fresh()->map_lat, 0.0001);
        $this->assertEqualsWithDelta(24.8436, $inDistrict->fresh()->map_lat, 0.0001);
        $this->assertEqualsWithDelta(24.75, $exact->fresh()->map_lat, 0.0001);

        $markers = collect($this->guest()->getJson('/api/v1/listings/map?city_id='.$this->city->id)->assertOk()->json('data'));
        $this->assertEqualsCanonicalizing([$car->id, $inDistrict->id, $exact->id], $markers->pluck('id')->all());
        $this->assertFalse($markers->firstWhere('id', $car->id)['exact_location']);
        $this->assertTrue($markers->firstWhere('id', $exact->id)['exact_location']);
    }

    public function test_any_owner_can_attach_a_video_that_shows_on_the_video_map_and_feed(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create(['role' => 'seller']);
        // A non-real-estate section, so editing it doesn't need the real-estate prices.
        $cars = Category::query()->where('slug', 'cars')->first() ?? Category::factory()->create(['slug' => 'cars']);
        $carSub = Subcategory::query()->where('category_id', $cars->id)->first() ?? Subcategory::factory()->create(['category_id' => $cars->id]);
        $car = $this->listing(['user_id' => $owner->id, 'title' => 'كامري 2022', 'category_id' => $cars->id, 'subcategory_id' => $carSub->id]);

        $res = $this->as($owner)->post('/api/v1/products/'.$car->id.'/videos', [
            'video' => UploadedFile::fake()->create('car.mp4', 1024, 'video/mp4'),
            'duration_sec' => 20,
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->assertTrue($res->json('data.is_short'));
        $this->assertNull($res->json('data.company'));
        $this->assertSame($car->id, $res->json('data.product.id'));
        $videoId = $res->json('data.id');

        // Someone else can't add or remove videos on this listing.
        $stranger = User::factory()->create(['role' => 'seller']);
        $this->as($stranger)->post('/api/v1/products/'.$car->id.'/videos', [
            'video' => UploadedFile::fake()->create('x.mp4', 10, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertForbidden();

        // Video map: only listings with a video, each carrying its video.
        $this->listing();
        $markers = $this->guest()->getJson('/api/v1/listings/map?has_video=1')->assertOk()->json('data');
        $this->assertCount(1, $markers);
        $this->assertSame($videoId, $markers[0]['video']['id']);

        // Owner chooses to show the video instead of the price on the map.
        $this->as($owner)->putJson('/api/v1/products/'.$car->id, ['map_display' => 'video'] + $this->updatePayload($car))->assertOk();
        $this->assertSame('video', $car->fresh()->map_display);

        // Feed (TikTok page) filtered by city.
        $feed = $this->guest()->getJson('/api/v1/videos/feed?city_id='.$this->city->id)->assertOk();
        $this->assertSame([$videoId], array_column($feed->json('data'), 'id'));
        $this->assertSame($owner->name, $feed->json('data.0.owner.name'));
        $this->assertSame([], $this->guest()->getJson('/api/v1/videos/feed?city_id='.City::factory()->create()->id)->json('data'));

        // Hidden listing → its video leaves the feed.
        $car->update(['status' => 'archived']);
        $this->assertSame([], $this->guest()->getJson('/api/v1/videos/feed')->json('data'));

        // Owner deletes the video → map display falls back to the price.
        $car->update(['status' => 'published']);
        $this->as($owner)->deleteJson('/api/v1/products/'.$car->id.'/videos/'.$videoId)->assertOk();
        $this->assertSame('price', $car->fresh()->map_display);
    }

    public function test_admin_controls_the_wholesale_button(): void
    {
        $this->assertFalse($this->guest()->getJson('/api/v1/homepage/features')->assertOk()->json('data.show_wholesale_button'));

        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->as($admin)->putJson('/api/v1/admin/site-features', ['show_wholesale_button' => true])
            ->assertOk()->assertJsonPath('data.show_wholesale_button', true);
        $this->assertTrue($this->guest()->getJson('/api/v1/homepage/features')->json('data.show_wholesale_button'));

        $this->as(User::factory()->create(['role' => 'seller']))->putJson('/api/v1/admin/site-features', ['show_wholesale_button' => false])
            ->assertForbidden();
    }

    /** @return array<string, mixed> */
    private function updatePayload(Product $p): array
    {
        return [
            'type' => $p->type ?? 'offer',
            'title' => $p->title,
            'description' => $p->description ?? 'وصف',
            'category_id' => $p->category_id,
            'subcategory_id' => $p->subcategory_id,
            'region_id' => $this->city->region_id,
            'city_id' => $this->city->id,
            'image_urls' => ['https://example.com/a.jpg'],
            'contact_messages' => true,
        ];
    }
}
