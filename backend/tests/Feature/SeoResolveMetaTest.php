<?php

namespace Tests\Feature;

use App\Models\SeoPageMeta;
use Database\Seeders\SeoDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoResolveMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_home_returns_title_and_json_ld(): void
    {
        $this->seed(SeoDefaultsSeeder::class);

        $response = $this->getJson('/api/v1/seo/resolve?path=/&lang=ar');

        $response->assertOk()
            ->assertJsonPath('data.page_key', 'home')
            ->assertJsonStructure([
                'data' => [
                    'title',
                    'description',
                    'canonical',
                    'hreflang',
                    'json_ld',
                ],
            ]);

        $title = $response->json('data.seo_title') ?? $response->json('data.title');
        $this->assertStringContainsString('عروض', (string) $title);
    }

    public function test_resolve_category_page_key(): void
    {
        SeoPageMeta::query()->create([
            'page_key' => 'category.cars',
            'route_pattern' => '/category/cars',
            'page_type' => 'category',
            'seo_title' => 'سيارات | عروض',
            'meta_description' => 'تصفح سيارات للبيع',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/seo/resolve?path=/category/cars&lang=ar')
            ->assertOk()
            ->assertJsonPath('data.page_key', 'category.cars')
            ->assertJsonPath('data.seo_title', 'سيارات | عروض');
    }
}
