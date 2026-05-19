<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\SeoGlobalSetting;
use App\Models\SeoPageMeta;
use App\Models\SeoSitemapSetting;
use App\Services\Seo\SeoSettingsService;
use Illuminate\Database\Seeder;

class SeoDefaultsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = config('seo.defaults', []);
        foreach ($defaults as $key => $value) {
            if (SeoGlobalSetting::query()->where('setting_key', $key)->doesntExist()) {
                SeoGlobalSetting::setValue($key, $value);
            }
        }

        SeoGlobalSetting::setValue('site_url', config('seo.site_url'));
        SeoGlobalSetting::setValue('schema_toggles', config('seo.schema_toggles'));
        SeoGlobalSetting::setValue('organization', [
            'name' => 'Arooth Platform',
            'logo' => '/logo.png',
            'sameAs' => [
                'https://twitter.com/AroothPlatform',
            ],
        ]);

        $home = config('seo.homepage', []);
        SeoPageMeta::query()->updateOrCreate(
            ['page_key' => 'home'],
            [
                'route_pattern' => '/',
                'page_type' => 'static',
                'seo_title' => $home['seo_title'] ?? null,
                'meta_description' => $home['meta_description'] ?? null,
                'priority' => $home['priority'] ?? 1.0,
                'changefreq' => $home['changefreq'] ?? 'daily',
                'is_active' => true,
            ]
        );

        foreach (config('seo.main_pages', []) as $page) {
            SeoPageMeta::query()->updateOrCreate(
                ['page_key' => $page['page_key']],
                [
                    'route_pattern' => $page['path'],
                    'page_type' => 'static',
                    'seo_title' => $page['seo_title'] ?? null,
                    'meta_description' => $page['meta_description'] ?? null,
                    'priority' => (float) ($page['priority'] ?? 0.7),
                    'changefreq' => $page['changefreq'] ?? 'weekly',
                    'robots' => $page['robots'] ?? 'index,follow',
                    'is_active' => true,
                ]
            );
        }

        $preferred = ['real-estate', 'cars', 'furniture', 'electronics'];
        Category::query()
            ->where('is_active', true)
            ->where(function ($q) use ($preferred) {
                $q->whereIn('slug', $preferred)->orWhereNull('parent_id');
            })
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->get()
            ->each(function (Category $category) {
                $name = $category->getLocalizedName('ar');
                SeoPageMeta::query()->updateOrCreate(
                    ['page_key' => 'category.'.$category->slug],
                    [
                        'route_pattern' => '/category/'.$category->slug,
                        'page_type' => $category->parent_id ? 'subcategory' : 'category',
                        'seo_title' => "{$name} | عروض",
                        'meta_description' => "تصفح إعلانات {$name} على منصة عروض. بيع واشتري بسهولة في السعودية.",
                        'priority' => in_array($category->slug, ['real-estate', 'cars'], true) ? 0.95 : 0.85,
                        'changefreq' => 'daily',
                        'is_active' => true,
                    ]
                );
            });

        SeoSitemapSetting::current();
        app(SeoSettingsService::class)->clearCache();
    }
}
