<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_listings_endpoint_paginates_and_filters_by_type(): void
    {
        Product::factory()->count(6)->create(['type' => 'offer', 'status' => 'published', 'moderation_status' => 'approved']);
        Product::factory()->count(4)->create(['type' => 'request', 'status' => 'published', 'moderation_status' => 'approved']);

        $response = $this->getJson('/api/v1/listings?type=offer&per_page=5');

        $response->assertOk()
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonCount(5, 'data');

        foreach ($response->json('data') as $item) {
            $this->assertSame('offer', data_get($item, 'type'));
        }
    }

    public function test_listing_detail_endpoint_increments_view_for_non_owner(): void
    {
        $product = Product::factory()->create([
            'status' => 'published',
            'moderation_status' => 'approved',
            'view_count' => 0,
            'today_view_count' => 0,
        ]);

        $this->getJson('/api/v1/listings/' . $product->id)
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);

        $product->refresh();
        $this->assertSame(1, $product->view_count);
        $this->assertSame(1, $product->today_view_count);
    }

    public function test_homepage_sections_endpoint_returns_curated_blocks(): void
    {
        Product::factory()->count(3)->create(['type' => 'offer', 'status' => 'published', 'moderation_status' => 'approved']);
        Product::factory()->count(2)->create(['type' => 'request', 'status' => 'published', 'moderation_status' => 'approved']);

        $response = $this->getJson('/api/v1/homepage/sections');

        $response->assertOk()->assertJsonStructure([
            'data' => [
                'latest_offers',
                'latest_requests',
                'most_viewed',
                'cheapest',
                'top_sold',
                'online_now',
            ],
        ]);
    }

    public function test_listings_endpoint_meets_basic_performance_baseline(): void
    {
        Product::factory()->count(150)->create(['status' => 'published', 'moderation_status' => 'approved']);

        $start = microtime(true);
        $response = $this->getJson('/api/v1/listings?per_page=20');
        $durationMs = (microtime(true) - $start) * 1000;

        $response->assertOk();
        $this->assertLessThan(700, $durationMs, 'Listings feed should return under 700ms in test baseline.');
    }
}
