<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealEstateListingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_listings_map_returns_only_geocoded_published_listings(): void
    {
        $category = Category::factory()->create(['slug' => 'real-estate']);

        Product::factory()->create([
            'status' => 'published',
            'moderation_status' => 'approved',
            'category_id' => $category->id,
            'location_lat' => 24.71,
            'location_lng' => 46.67,
            'is_wholesale' => false,
        ]);

        Product::factory()->create([
            'status' => 'published',
            'moderation_status' => 'approved',
            'location_lat' => null,
            'location_lng' => null,
            'is_wholesale' => false,
        ]);

        $response = $this->getJson('/api/v1/listings/map');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_store_real_estate_requires_real_estate_payload(): void
    {
        $user = User::factory()->create();
        $category = Category::factory()->create(['slug' => 'real-estate']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/products', [
            'type' => 'offer',
            'title' => 'فيلا للبيع',
            'description' => 'وصف تجريبي للعقار',
            'category_id' => $category->id,
            'image_urls' => ['https://example.com/a.jpg'],
            'contact_phone' => false,
            'contact_messages' => true,
            'location_lat' => 24.71,
            'location_lng' => 46.67,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['real_estate.purpose']);
    }
}
