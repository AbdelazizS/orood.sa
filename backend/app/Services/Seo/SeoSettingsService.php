<?php

namespace App\Services\Seo;

use App\Models\Category;
use App\Models\SeoGlobalSetting;
use App\Models\SeoPageMeta;
use Illuminate\Support\Facades\Cache;

class SeoSettingsService
{
    public function siteUrl(): string
    {
        $url = (string) (SeoGlobalSetting::getValue('site_url') ?? config('seo.site_url', 'https://www.arooth.com'));

        return rtrim($url, '/');
    }

    /** @return array<string, mixed> */
    public function globalSettings(): array
    {
        return Cache::remember('seo:global_settings', 300, function () {
            $defaults = config('seo.defaults', []);
            $keys = [
                'site_name', 'title_suffix', 'meta_description', 'meta_keywords',
                'og_image', 'twitter_site', 'robots', 'geo_region', 'geo_placename', 'author',
                'hreflang_default', 'schema_toggles', 'organization',
            ];
            $out = [];
            foreach ($keys as $key) {
                $out[$key] = SeoGlobalSetting::getValue($key, $defaults[$key] ?? null);
            }

            return $out;
        });
    }

    public function setGlobalSettings(array $data): void
    {
        foreach ($data as $key => $value) {
            if ($value !== null) {
                SeoGlobalSetting::setValue($key, $value);
            }
        }
        Cache::forget('seo:global_settings');
    }

    public function pageMetaByKey(string $pageKey): ?SeoPageMeta
    {
        return Cache::remember("seo:page:{$pageKey}", 300, function () use ($pageKey) {
            return SeoPageMeta::query()
                ->where('page_key', $pageKey)
                ->where('is_active', true)
                ->first();
        });
    }

    /**
     * Resolve SEO payload for a frontend path.
     *
     * @return array<string, mixed>
     */
    public function resolveForPath(string $path, string $lang = 'ar', array $context = []): array
    {
        $path = '/'.trim($path, '/');
        if ($path === '/') {
            $path = '/';
        }

        $global = $this->globalSettings();
        $pageKey = $this->pageKeyForPath($path, $context);
        $page = $pageKey ? $this->pageMetaByKey($pageKey) : null;

        $title = $page?->seo_title
            ?? $context['title']
            ?? null;
        $description = $page?->meta_description
            ?? $context['description']
            ?? ($global['meta_description'] ?? config('seo.defaults.meta_description'));
        $keywords = $page?->meta_keywords ?? ($global['meta_keywords'] ?? null);
        $robots = $page?->robots ?? ($global['robots'] ?? 'index,follow');
        $canonical = $page?->canonical_url ?? $this->siteUrl().($path === '/' ? '' : $path);

        if (! $title && $pageKey === 'home') {
            $title = config('seo.homepage.seo_title');
        }

        $siteName = $global['site_name'] ?? 'عروض Arooth';
        $suffix = $global['title_suffix'] ?? " | {$siteName}";
        $fullTitle = $title
            ? (str_contains($title, $siteName) ? $title : $title.$suffix)
            : "منصة العروض | {$siteName}";

        $ogTitle = $page?->og_title ?: $title ?: $fullTitle;
        $ogDescription = $page?->og_description ?: $description;
        $ogImage = $this->absoluteUrl($page?->og_image ?? $context['image'] ?? $global['og_image'] ?? '/logo.png');

        $builder = app(SeoStructuredDataBuilder::class);
        $jsonLd = $builder->buildForPath($path, $lang, array_merge($context, [
            'title' => $title,
            'description' => $description,
            'canonical' => $canonical,
        ]));

        return [
            'path' => $path,
            'page_key' => $pageKey,
            'title' => $fullTitle,
            'seo_title' => $title,
            'description' => $description,
            'keywords' => $keywords,
            'robots' => $robots,
            'canonical' => $canonical,
            'og' => [
                'title' => $ogTitle,
                'description' => $ogDescription,
                'image' => $ogImage,
                'type' => $page?->og_type ?? $context['og_type'] ?? 'website',
                'site_name' => $siteName,
                'locale' => $lang === 'en' ? 'en_US' : 'ar_SA',
            ],
            'twitter' => [
                'card' => $page?->twitter_card ?? 'summary_large_image',
                'site' => $global['twitter_site'] ?? null,
                'title' => $ogTitle,
                'description' => $ogDescription,
                'image' => $ogImage,
            ],
            'hreflang' => [
                ['lang' => 'ar', 'url' => $canonical],
                ['lang' => 'x-default', 'url' => $canonical],
            ],
            'json_ld' => $jsonLd,
        ];
    }

    public function pageKeyForPath(string $path, array $context = []): ?string
    {
        if (isset($context['page_key'])) {
            return (string) $context['page_key'];
        }

        if ($path === '/' || $path === '') {
            return 'home';
        }

        if (preg_match('#^/category/([^/]+)$#', $path, $m)) {
            return 'category.'.$m[1];
        }

        $staticMap = [
            '/wholesale' => 'wholesale',
            '/add' => 'add',
            '/requests' => 'requests',
            '/contact' => 'contact',
            '/help' => 'help',
            '/login' => 'login',
            '/register' => 'register',
            '/terms' => 'terms',
            '/privacy-policy' => 'privacy',
            '/refund-policy' => 'refund',
            '/payment-policy' => 'payment_policy',
            '/listing-policy' => 'listing_policy',
            '/safety' => 'safety',
            '/fees' => 'fees',
            '/about' => 'about',
            '/services' => 'services',
            '/listings/map' => 'listings_map',
        ];

        return $staticMap[$path] ?? null;
    }

    public function upsertPageMeta(string $pageKey, array $data): SeoPageMeta
    {
        $page = SeoPageMeta::query()->updateOrCreate(
            ['page_key' => $pageKey],
            $data
        );
        Cache::forget("seo:page:{$pageKey}");

        return $page;
    }

    public function listPageMeta(): array
    {
        return SeoPageMeta::query()->orderBy('page_key')->get()->all();
    }

    public function syncCategoryPageMeta(): int
    {
        $count = 0;
        Category::query()
            ->where('is_active', true)
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->each(function (Category $category) use (&$count) {
                $key = 'category.'.$category->slug;
                $name = $category->getLocalizedName('ar');
                $this->upsertPageMeta($key, [
                    'route_pattern' => '/category/'.$category->slug,
                    'page_type' => $category->parent_id ? 'subcategory' : 'category',
                    'seo_title' => $name.' - عروض',
                    'meta_description' => "تصفح إعلانات {$name} على منصة عروض. بيع واشتري بسهولة في السعودية.",
                    'priority' => $category->parent_id
                        ? (float) config('seo.category_priority.default_child', 0.75)
                        : (float) (config('seo.category_priority')[$category->slug] ?? config('seo.category_priority.default_parent', 0.85)),
                    'changefreq' => 'daily',
                    'is_active' => true,
                ]);
                $count++;
            });

        return $count;
    }

    public function clearCache(): void
    {
        Cache::forget('seo:global_settings');
        SeoPageMeta::query()->pluck('page_key')->each(fn ($k) => Cache::forget("seo:page:{$k}"));
    }

    private function absoluteUrl(?string $path): string
    {
        if (! $path) {
            return $this->siteUrl().'/logo.png';
        }
        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return $this->siteUrl().'/'.ltrim($path, '/');
    }
}
