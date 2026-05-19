<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\Seo\SeoSitemapGenerator;
use Database\Seeders\SeoDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SeoSitemapGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        foreach (glob(public_path('sitemap*.xml')) ?: [] as $file) {
            @unlink($file);
        }
        if (File::exists(public_path('robots.txt'))) {
            @unlink(public_path('robots.txt'));
        }

        parent::tearDown();
    }

    public function test_generator_writes_index_and_excludes_staff_profiles(): void
    {
        $this->seed(SeoDefaultsSeeder::class);

        Category::factory()->create([
            'slug' => 'cars',
            'is_active' => true,
            'parent_id' => null,
        ]);

        Product::factory()->create([
            'status' => 'published',
            'moderation_status' => 'approved',
            'is_wholesale' => false,
        ]);

        User::factory()->create([
            'role' => 'admin',
            'username' => 'staff-admin',
        ]);

        $seller = User::factory()->create([
            'role' => 'seller',
            'username' => 'public-seller',
        ]);

        Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'published',
            'moderation_status' => 'approved',
            'is_wholesale' => false,
        ]);

        $result = app(SeoSitemapGenerator::class)->generate('https://www.arooth.test');

        $this->assertGreaterThan(0, $result['url_count']);
        $this->assertFileExists(public_path('sitemap_index.xml'));
        $this->assertFileExists(public_path('sitemap.xml'));

        $index = File::get(public_path('sitemap_index.xml'));
        $this->assertStringContainsString('<lastmod>', $index);

        $profiles = File::exists(public_path('sitemap_profiles.xml'))
            ? File::get(public_path('sitemap_profiles.xml'))
            : '';
        $this->assertStringNotContainsString('staff-admin', $profiles);
        $this->assertStringContainsString('/category/cars', File::get(public_path('sitemap_categories.xml')));

        $robots = File::get(public_path('robots.txt'));
        $this->assertStringContainsString('sitemap_index.xml', $robots);
        $this->assertStringContainsString('Disallow: /admin', $robots);

        $main = File::get(public_path('sitemap_main.xml'));
        $this->assertStringContainsString('/login', $main);
        $this->assertStringNotContainsString('/register', $main);
    }
}
