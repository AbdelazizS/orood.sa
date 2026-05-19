<?php

namespace App\Services\Seo;

use App\Models\SeoGlobalSetting;

class SeoStructuredDataBuilder
{
    public function __construct(
        private readonly SeoSettingsService $settings
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function buildForPath(string $path, string $lang = 'ar', array $context = []): array
    {
        $toggles = SeoGlobalSetting::getValue('schema_toggles', config('seo.schema_toggles', []));
        $base = $this->settings->siteUrl();
        $graphs = [];

        if ($path === '/' || $path === '') {
            if ($toggles['website'] ?? true) {
                $graphs[] = $this->webSite($base, $lang);
            }
            if ($toggles['organization'] ?? true) {
                $graphs[] = $this->organization($base);
            }

            return $graphs;
        }

        if (preg_match('#^/category/([^/]+)$#', $path, $m)) {
            if ($toggles['collection_page'] ?? true) {
                $graphs[] = $this->collectionPage(
                    $base.$path,
                    $context['title'] ?? $m[1],
                    $context['description'] ?? ''
                );
            }
            if ($toggles['breadcrumbs'] ?? true) {
                $graphs[] = $this->breadcrumbs([
                    ['name' => $lang === 'en' ? 'Home' : 'الرئيسية', 'url' => $base.'/'],
                    ['name' => $context['title'] ?? $m[1], 'url' => $base.$path],
                ]);
            }

            return $graphs;
        }

        if (preg_match('#^/wholesale$#', $path)) {
            if ($toggles['collection_page'] ?? true) {
                $graphs[] = $this->collectionPage(
                    $base.'/wholesale',
                    $lang === 'en' ? 'Wholesale market' : 'سوق الجملة',
                    $context['description'] ?? ''
                );
            }

            return $graphs;
        }

        if (! empty($context['product_schema'])) {
            if ($toggles['product'] ?? true) {
                $graphs[] = $context['product_schema'];
            }
            if (($toggles['breadcrumbs'] ?? true) && ! empty($context['breadcrumbs'])) {
                $graphs[] = $this->breadcrumbs($context['breadcrumbs']);
            }
        }

        if (! empty($context['custom_schema'])) {
            $graphs[] = $context['custom_schema'];
        }

        return $graphs;
    }

    /** @return array<string, mixed> */
    public function webSite(string $base, string $lang): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => SeoGlobalSetting::getValue('site_name', config('seo.defaults.site_name')),
            'url' => $base.'/',
            'inLanguage' => $lang === 'en' ? 'en' : 'ar',
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => [
                    '@type' => 'EntryPoint',
                    'urlTemplate' => $base.'/?q={search_term_string}',
                ],
                'query-input' => 'required name=search_term_string',
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function organization(string $base): array
    {
        $org = SeoGlobalSetting::getValue('organization', []);
        $name = $org['name'] ?? 'Arooth Platform';
        $logo = $org['logo'] ?? '/logo.png';
        if ($logo && ! str_starts_with($logo, 'http')) {
            $logo = $base.'/'.ltrim($logo, '/');
        }

        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => $name,
            'url' => $base.'/',
            'logo' => $logo,
        ];

        if (! empty($org['sameAs']) && is_array($org['sameAs'])) {
            $schema['sameAs'] = array_values($org['sameAs']);
        }

        return $schema;
    }

    /** @return array<string, mixed> */
    public function collectionPage(string $url, string $name, string $description): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'CollectionPage',
            'name' => $name,
            'description' => $description,
            'url' => $url,
        ];
    }

    /**
     * @param  array<int, array{name: string, url: string}>  $items
     * @return array<string, mixed>
     */
    public function breadcrumbs(array $items): array
    {
        $list = [];
        foreach ($items as $i => $item) {
            $list[] = [
                '@type' => 'ListItem',
                'position' => $i + 1,
                'name' => $item['name'],
                'item' => $item['url'],
            ];
        }

        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => $list,
        ];
    }
}
