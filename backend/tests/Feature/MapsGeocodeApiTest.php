<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MapsGeocodeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_geocode_search_returns_normalized_results(): void
    {
        config([
            'maps.nominatim_base_url' => 'https://nominatim.test',
            'maps.nominatim_user_agent' => 'AroothTest/1.0',
            'maps.geocode_cache_ttl' => 60,
        ]);

        Http::fake([
            'nominatim.test/search*' => Http::response([
                [
                    'display_name' => 'Riyadh, Saudi Arabia',
                    'lat' => '24.7136',
                    'lon' => '46.6753',
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/maps/geocode/search?q=' . urlencode('الرياض'));

        $response->assertOk()
            ->assertJsonPath('data.0.label', 'Riyadh, Saudi Arabia')
            ->assertJsonPath('data.0.lat', 24.7136)
            ->assertJsonPath('data.0.lng', 46.6753);
    }

    public function test_geocode_search_validates_query_length(): void
    {
        $this->getJson('/api/v1/maps/geocode/search?q=a')
            ->assertStatus(422);
    }

    public function test_geocode_reverse_returns_place_detail(): void
    {
        config([
            'maps.nominatim_base_url' => 'https://nominatim.test',
            'maps.geocode_cache_ttl' => 60,
        ]);

        Http::fake([
            'nominatim.test/reverse*' => Http::response([
                'display_name' => 'King Fahd Road, Riyadh',
                'address' => [
                    'road' => 'King Fahd Road',
                    'city' => 'Riyadh',
                    'state' => 'Riyadh Region',
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/maps/geocode/reverse?lat=24.71&lng=46.67');

        $response->assertOk()
            ->assertJsonPath('data.placeName', 'King Fahd Road, Riyadh')
            ->assertJsonPath('data.cityName', 'Riyadh');
    }

    public function test_geocode_reverse_validates_coordinates(): void
    {
        $this->getJson('/api/v1/maps/geocode/reverse?lat=999&lng=46')
            ->assertStatus(422);
    }
}
