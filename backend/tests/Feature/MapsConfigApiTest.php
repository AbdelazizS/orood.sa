<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MapsConfigApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_maps_config_returns_public_fields_without_token_by_default(): void
    {
        config([
            'maps.mapbox_public_token' => '',
            'maps.engine' => null,
            'maps.default_lat' => 24.7136,
            'maps.default_lng' => 46.6753,
        ]);

        $response = $this->getJson('/api/v1/maps/config');

        $response->assertOk()
            ->assertJsonPath('data.mapbox_public_token', null)
            ->assertJsonPath('data.default_center.lat', 24.7136)
            ->assertJsonPath('data.default_center.lng', 46.6753);
    }

    public function test_maps_config_exposes_mapbox_public_token_when_configured(): void
    {
        config([
            'maps.mapbox_public_token' => 'pk.test-token',
            'maps.engine' => 'manfith',
            'maps.style_id' => 'mapbox/streets-v12',
        ]);

        $response = $this->getJson('/api/v1/maps/config');

        $response->assertOk()
            ->assertJsonPath('data.mapbox_public_token', 'pk.test-token')
            ->assertJsonPath('data.engine', 'manfith')
            ->assertJsonPath('data.style_id', 'mapbox/streets-v12');
    }
}
