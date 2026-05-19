<?php

namespace Tests\Feature;

use App\Models\ServiceCategory;
use App\Models\ServiceProvider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceMarketApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_service_categories(): void
    {
        $this->getJson('/api/v1/services/categories')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'slug', 'name']]]);
    }

    public function test_lists_active_service_providers(): void
    {
        $user = User::factory()->create();
        $category = ServiceCategory::query()->first();
        ServiceProvider::create([
            'user_id' => $user->id,
            'service_category_id' => $category?->id,
            'service_type' => 'moving',
            'title' => 'Fast movers',
            'description' => 'City-wide delivery',
            'cities' => ['Riyadh'],
            'pricing_type' => 'quote',
            'price_from' => 100,
            'status' => ServiceProvider::STATUS_ACTIVE,
            'is_available' => true,
        ]);

        $this->getJson('/api/v1/services/providers')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Fast movers');
    }
}
