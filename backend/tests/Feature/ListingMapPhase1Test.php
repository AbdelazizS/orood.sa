<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Product;
use App\Models\ProductRealEstateDetail;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ListingMapPhase1Test extends TestCase
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
        $this->city = City::factory()->create();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @param  array<string, mixed>  $detail
     */
    private function listing(array $overrides = [], array $detail = []): Product
    {
        $product = Product::factory()->create(array_merge([
            'status' => 'published',
            'moderation_status' => 'approved',
            'category_id' => $this->realEstate->id,
            'city_id' => $this->city->id,
            'location_lat' => 24.71,
            'location_lng' => 46.67,
            'is_wholesale' => false,
            'price' => 850000,
            'contact_phone' => '0500000000',
            'published_at' => now(),
        ], $overrides));

        ProductRealEstateDetail::query()->create(array_merge([
            'product_id' => $product->id,
            'purpose' => 'sale',
            'property_type' => 'villa',
            'area_sqm' => 400,
            'street_width_m' => 15,
        ], $detail));

        return $product;
    }

    private function markerFor(array $markers, int $id): ?array
    {
        return collect($markers)->firstWhere('id', $id);
    }

    public function test_awaiting_listing_appears_on_map_with_null_price(): void
    {
        $normal = $this->listing();
        $awaiting = $this->listing(['marketing_status' => Product::MARKETING_AWAITING, 'price' => 1200000]);

        $response = $this->getJson('/api/v1/listings/map')->assertOk();
        $markers = $response->json('data');

        $this->assertCount(2, $markers);
        $this->assertEquals(850000, $this->markerFor($markers, $normal->id)['price']);
        $awaitingMarker = $this->markerFor($markers, $awaiting->id);
        $this->assertNull($awaitingMarker['price']);
        $this->assertSame(Product::MARKETING_AWAITING, $awaitingMarker['marketing_status']);
        $this->assertStringNotContainsString('1200000', $response->getContent());
    }

    public function test_awaiting_listing_can_be_excluded_and_rejected_ones_never_show(): void
    {
        $this->listing();
        $this->listing(['marketing_status' => Product::MARKETING_AWAITING]);
        $this->listing(['marketing_status' => Product::MARKETING_AWAITING, 'moderation_status' => 'rejected']);
        $this->listing(['marketing_status' => Product::MARKETING_AWAITING, 'status' => 'deleted']);

        $this->getJson('/api/v1/listings/map')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/listings/map?include_awaiting=0')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_price_filters_apply_and_exclude_awaiting_listings(): void
    {
        $cheap = $this->listing(['price' => 500000]);
        $mid = $this->listing(['price' => 900000]);
        $this->listing(['price' => 2000000]);
        $this->listing(['marketing_status' => Product::MARKETING_AWAITING, 'price' => 900000]);

        $ids = collect($this->getJson('/api/v1/listings/map?min_price=600000&max_price=1000000')->assertOk()->json('data'))->pluck('id')->all();
        $this->assertSame([$mid->id], $ids);

        $ids = collect($this->getJson('/api/v1/listings/map?max_price=600000')->json('data'))->pluck('id')->all();
        $this->assertSame([$cheap->id], $ids);
    }

    public function test_district_and_street_width_filters(): void
    {
        $narrow = $this->listing(['district' => 'النرجس'], ['street_width_m' => 10]);
        $wide = $this->listing(['district' => 'النرجس'], ['street_width_m' => 30]);
        $this->listing(['district' => 'الملقا'], ['street_width_m' => 40]);

        $ids = collect($this->getJson('/api/v1/listings/map?district='.urlencode('النرجس'))->json('data'))->pluck('id')->sort()->values()->all();
        $this->assertSame([$narrow->id, $wide->id], $ids);

        $ids = collect($this->getJson('/api/v1/listings/map?district='.urlencode('النرجس').'&street_width_min=20')->json('data'))->pluck('id')->all();
        $this->assertSame([$wide->id], $ids);

        $marker = $this->markerFor($this->getJson('/api/v1/listings/map')->json('data'), $wide->id);
        $this->assertSame('النرجس', $marker['district']);
        $this->assertEquals(30, $marker['street_width']);
    }

    public function test_bounds_still_filter_for_both_groups(): void
    {
        $inside = $this->listing();
        $insideAwaiting = $this->listing(['marketing_status' => Product::MARKETING_AWAITING]);
        $this->listing(['location_lat' => 21.48, 'location_lng' => 39.19]);
        $this->listing(['marketing_status' => Product::MARKETING_AWAITING, 'location_lat' => 21.48, 'location_lng' => 39.19]);

        $ids = collect($this->getJson('/api/v1/listings/map?north=25&south=24&east=47&west=46')->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();

        $this->assertSame([$inside->id, $insideAwaiting->id], $ids);
    }

    public function test_user_id_filter(): void
    {
        $seller = User::factory()->create();
        $mine = $this->listing(['user_id' => $seller->id]);
        $this->listing();

        $ids = collect($this->getJson('/api/v1/listings/map?user_id='.$seller->id)->json('data'))->pluck('id')->all();
        $this->assertSame([$mine->id], $ids);
    }

    public function test_districts_endpoint_returns_distinct_sorted_values(): void
    {
        $this->listing(['district' => 'الملقا']);
        $this->listing(['district' => 'النرجس']);
        $this->listing(['district' => 'النرجس']);
        $this->listing(['district' => '']);
        $this->listing(['district' => 'مخفي', 'status' => 'deleted']);
        $this->listing(['district' => 'مدينة أخرى', 'city_id' => City::factory()->create()->id]);

        $this->getJson('/api/v1/listings/map/districts?city_id='.$this->city->id)
            ->assertOk()
            ->assertExactJson(['data' => ['الملقا', 'النرجس']]);

        $this->getJson('/api/v1/listings/map/districts')->assertStatus(422);
    }

    public function test_guest_gets_no_price_or_contact_on_awaiting_detail_but_owner_does(): void
    {
        $owner = User::factory()->create(['role' => 'seller', 'phone' => '0511111111']);
        $awaiting = $this->listing([
            'user_id' => $owner->id,
            'marketing_status' => Product::MARKETING_AWAITING,
            'price' => 1200000,
        ]);

        $guest = $this->getJson('/api/v1/products/'.$awaiting->id)->assertOk();
        $guest->assertJsonPath('data.price', null)
            ->assertJsonPath('data.contact_phone', null)
            ->assertJsonPath('data.seller.phone', null)
            ->assertJsonPath('data.marketing_status', Product::MARKETING_AWAITING);

        $this->getJson('/api/v1/listings/'.$awaiting->id)->assertOk()->assertJsonPath('data.price', null);

        $other = User::factory()->create(['role' => 'buyer']);
        $this->withHeader('Authorization', 'Bearer '.$this->issueApiToken($other))
            ->getJson('/api/v1/products/'.$awaiting->id)
            ->assertOk()
            ->assertJsonPath('data.price', null);

        $this->app['auth']->forgetGuards();

        $ownerResponse = $this->withHeader('Authorization', 'Bearer '.$this->issueApiToken($owner))
            ->getJson('/api/v1/products/'.$awaiting->id)
            ->assertOk();
        $this->assertEquals(1200000, $ownerResponse->json('data.price'));
        $this->assertSame('0500000000', $ownerResponse->json('data.contact_phone'));
    }

    public function test_awaiting_listing_pending_moderation_is_not_public(): void
    {
        $awaiting = $this->listing([
            'status' => 'pending_review',
            'moderation_status' => 'pending',
            'marketing_status' => Product::MARKETING_AWAITING,
        ]);

        $this->getJson('/api/v1/products/'.$awaiting->id)->assertNotFound();
        $this->getJson('/api/v1/listings/map')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_store_with_needs_marketer_sets_awaiting_only_for_real_estate(): void
    {
        config(['listings.auto_publish_on_create' => true]);
        $seller = User::factory()->create(['role' => 'seller']);
        $token = $this->issueApiToken($seller);
        $reSub = Subcategory::query()->where('category_id', $this->realEstate->id)->first()
            ?? Subcategory::factory()->create(['category_id' => $this->realEstate->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/products', [
            'type' => 'offer',
            'title' => 'فيلا تحتاج مسوق',
            'description' => 'وصف تجريبي للعقار',
            'price' => 1500000,
            'price_per_meter' => 3750,
            'category_id' => $this->realEstate->id,
            'subcategory_id' => $reSub->id,
            'city_id' => $this->city->id,
            'image_urls' => ['https://example.com/a.jpg'],
            'contact_phone' => false,
            'contact_messages' => true,
            'location_lat' => 24.71,
            'location_lng' => 46.67,
            'district' => '  النرجس ',
            'needs_marketer' => true,
            'real_estate' => ['purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400],
            'listing_attributes' => ['purpose' => 'sale', 'property_type' => 'villa', 'area_sqm' => 400],
        ])->assertCreated();

        $product = Product::query()->findOrFail($response->json('data.id'));
        $this->assertSame(Product::MARKETING_AWAITING, $product->marketing_status);
        $this->assertSame('النرجس', $product->district);

        $other = Category::factory()->create(['slug' => 'phase1-electronics']);
        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/products', [
            'type' => 'offer',
            'title' => 'جوال',
            'description' => 'وصف',
            'category_id' => $other->id,
            'subcategory_id' => Subcategory::factory()->create(['category_id' => $other->id])->id,
            'image_urls' => ['https://example.com/b.jpg'],
            'contact_messages' => true,
            'needs_marketer' => true,
        ])->assertCreated();

        $this->assertNull(Product::query()->findOrFail($response->json('data.id'))->marketing_status);
    }

    public function test_admin_can_toggle_marketing_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->listing();

        $this->withHeader('Authorization', 'Bearer '.$this->issueApiToken($admin))
            ->patchJson('/api/v1/admin/products/'.$product->id.'/marketing-status', ['marketing_status' => 'awaiting_marketer'])
            ->assertOk()
            ->assertJsonPath('data.marketing_status', 'awaiting_marketer');
        $this->assertTrue($product->fresh()->isAwaitingMarketer());

        $this->withHeader('Authorization', 'Bearer '.$this->issueApiToken($admin))
            ->patchJson('/api/v1/admin/products/'.$product->id.'/marketing-status', ['marketing_status' => 'bogus'])
            ->assertStatus(422);

        $seller = User::factory()->create(['role' => 'seller']);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->issueApiToken($seller))
            ->patchJson('/api/v1/admin/products/'.$product->id.'/marketing-status', ['marketing_status' => null])
            ->assertForbidden();
    }
}
