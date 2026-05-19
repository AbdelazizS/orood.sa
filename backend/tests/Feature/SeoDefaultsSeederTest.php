<?php

namespace Tests\Feature;

use App\Models\SeoPageMeta;
use Database\Seeders\SeoDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoDefaultsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitelink_pages_have_meta_descriptions_after_seed(): void
    {
        $this->seed(SeoDefaultsSeeder::class);

        foreach (['wholesale', 'add', 'help', 'login', 'requests'] as $pageKey) {
            $page = SeoPageMeta::query()->where('page_key', $pageKey)->first();
            $this->assertNotNull($page, "Missing seo_page_meta for {$pageKey}");
            $this->assertNotEmpty($page->seo_title, "Missing seo_title for {$pageKey}");
            $this->assertNotEmpty($page->meta_description, "Missing meta_description for {$pageKey}");
        }

        $login = SeoPageMeta::query()->where('page_key', 'login')->first();
        $this->assertStringContainsString('index', (string) $login->robots);
    }
}
