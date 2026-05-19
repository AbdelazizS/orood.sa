<?php

namespace App\Services\Seo;

use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\SeoPageMeta;
use App\Models\SeoSitemapSetting;
use App\Models\User;
use Illuminate\Support\Facades\File;

class SeoSitemapGenerator
{
    private string $base;

    private SeoSitemapSetting $settings;

    private int $urlCount = 0;

    /** @var array<int, string> */
    private array $indexFiles = [];

    public function __construct(
        private readonly SeoSettingsService $seoSettings
    ) {}

    /**
     * @return array{files: array<int, string>, url_count: int}
     */
    public function generate(?string $baseUrl = null): array
    {
        $this->base = rtrim($baseUrl ?? $this->seoSettings->siteUrl(), '/');
        $this->settings = SeoSitemapSetting::current();
        $this->urlCount = 0;
        $this->indexFiles = [];

        $public = public_path();
        File::ensureDirectoryExists($public);

        if ($this->settings->include_main) {
            $this->writeMainSitemap($public);
        }

        if ($this->settings->include_categories || $this->settings->include_subcategories) {
            $this->writeCategoriesSitemap($public);
        }

        if ($this->settings->include_offers) {
            $this->writeListingsSitemaps($public);
        }

        if ($this->settings->include_wholesale) {
            $this->writeWholesaleSitemap($public);
        }

        if ($this->settings->include_companies) {
            $this->writeCompaniesSitemap($public);
        }

        if ($this->settings->include_profiles) {
            $this->writeProfilesSitemap($public);
        }

        $this->writeIndex($public);
        $this->writeRobots($public);

        $this->settings->update([
            'last_generated_at' => now(),
            'last_url_count' => $this->urlCount,
        ]);

        return [
            'files' => $this->indexFiles,
            'url_count' => $this->urlCount,
        ];
    }

    private function writeMainSitemap(string $public): void
    {
        $body = $this->urlsetOpen();
        $home = config('seo.homepage', []);
        $body .= $this->urlEntry($this->base.'/', (string) ($home['priority'] ?? '1.0'), $home['changefreq'] ?? 'daily');

        foreach (config('seo.main_pages', []) as $page) {
            if ($this->pageIsNoindex($page['page_key'] ?? null, $page['robots'] ?? null)) {
                continue;
            }
            $body .= $this->urlEntry(
                $this->base.($page['path'] ?? '/'),
                (string) ($page['priority'] ?? '0.7'),
                $page['changefreq'] ?? 'weekly'
            );
        }

        $body .= '</urlset>';
        $this->saveChunk('sitemap_main.xml', $body, $public);
    }

    private function writeCategoriesSitemap(string $public): void
    {
        $body = $this->urlsetOpen();
        $priorities = config('seo.category_priority', []);

        Category::query()
            ->where('is_active', true)
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->orderBy('parent_id')
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'parent_id', 'updated_at'])
            ->each(function (Category $cat) use (&$body, $priorities) {
                $isChild = (bool) $cat->parent_id;
                if ($isChild && ! $this->settings->include_subcategories) {
                    return;
                }
                if (! $isChild && ! $this->settings->include_categories) {
                    return;
                }

                $priority = $isChild
                    ? (string) ($priorities['default_child'] ?? '0.75')
                    : (string) ($priorities[$cat->slug] ?? $priorities['default_parent'] ?? '0.85');

                $body .= $this->urlEntry(
                    $this->base.'/category/'.$cat->slug,
                    $priority,
                    'daily',
                    $cat->updated_at?->toAtomString()
                );
            });

        $body .= '</urlset>';
        $this->saveChunk('sitemap_categories.xml', $body, $public);
    }

    private function writeListingsSitemaps(string $public): void
    {
        $chunkSize = min(5000, max(1000, (int) $this->settings->urls_per_file));
        $chunk = 0;

        Product::query()
            ->publiclyListed()
            ->where('is_wholesale', false)
            ->orderBy('id')
            ->select(['id', 'updated_at', 'published_at'])
            ->chunkById($chunkSize, function ($products) use (&$chunk, $public) {
                $chunk++;
                $filename = "sitemap_listings_{$chunk}.xml";
                $body = $this->urlsetOpen();
                foreach ($products as $product) {
                    $lastmod = ($product->updated_at ?? $product->published_at)?->toAtomString();
                    $priority = $this->listingPriority($product->updated_at ?? $product->published_at);
                    $body .= $this->urlEntry(
                        "{$this->base}/products/{$product->id}",
                        $priority,
                        'weekly',
                        $lastmod
                    );
                }
                $body .= '</urlset>';
                $this->saveChunk($filename, $body, $public);
            });
    }

    private function writeWholesaleSitemap(string $public): void
    {
        $body = $this->urlsetOpen();
        $body .= $this->urlEntry($this->base.'/wholesale', '0.9', 'daily');

        Product::query()
            ->publiclyListed()
            ->where('is_wholesale', true)
            ->orderBy('id')
            ->select(['id', 'updated_at', 'published_at'])
            ->chunkById(5000, function ($products) use (&$body) {
                foreach ($products as $product) {
                    $lastmod = ($product->updated_at ?? $product->published_at)?->toAtomString();
                    $body .= $this->urlEntry(
                        "{$this->base}/wholesale/product/{$product->id}",
                        '0.8',
                        'weekly',
                        $lastmod
                    );
                }
            });

        $body .= '</urlset>';
        $this->saveChunk('sitemap_wholesale.xml', $body, $public);
    }

    private function writeCompaniesSitemap(string $public): void
    {
        $body = $this->urlsetOpen();

        Company::query()
            ->where('verification_status', 'approved')
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->orderBy('id')
            ->get(['id', 'slug', 'updated_at'])
            ->each(function (Company $company) use (&$body) {
                $body .= $this->urlEntry(
                    "{$this->base}/wholesale/company/{$company->id}",
                    '0.7',
                    'weekly',
                    $company->updated_at?->toAtomString()
                );
            });

        $body .= '</urlset>';
        $this->saveChunk('sitemap_companies.xml', $body, $public);
    }

    private function writeProfilesSitemap(string $public): void
    {
        $staffRoles = config('seo.staff_roles', []);
        $marketplaceRoles = config('seo.marketplace_roles', ['user', 'buyer', 'seller', 'company']);

        $body = $this->urlsetOpen();

        User::query()
            ->whereNotNull('username')
            ->where('username', '!=', '')
            ->whereNotIn('role', $staffRoles)
            ->whereIn('role', $marketplaceRoles)
            ->whereHas('products', fn ($q) => $q->publiclyListed())
            ->orderByDesc('updated_at')
            ->limit(2000)
            ->get(['id', 'username', 'updated_at'])
            ->each(function (User $user) use (&$body) {
                $body .= $this->urlEntry(
                    "{$this->base}/profile/{$user->username}",
                    '0.5',
                    'weekly',
                    $user->updated_at?->toAtomString()
                );
            });

        $body .= '</urlset>';
        $this->saveChunk('sitemap_profiles.xml', $body, $public);
    }

    private function writeIndex(string $public): void
    {
        $index = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $index .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach ($this->indexFiles as $file) {
            $path = "{$public}/{$file}";
            $lastmod = File::exists($path)
                ? date('c', File::lastModified($path))
                : now()->toAtomString();
            $index .= $this->sitemapIndexEntry("{$this->base}/{$file}", $lastmod);
        }

        $index .= '</sitemapindex>';

        File::put("{$public}/sitemap_index.xml", $index);
        File::put("{$public}/sitemap.xml", $index);
    }

    private function writeRobots(string $public): void
    {
        $custom = $this->settings->robots_txt;
        if ($custom) {
            File::put("{$public}/robots.txt", $custom);

            return;
        }

        $robots = "User-agent: *\n";
        $robots .= "Allow: /\n";
        $robots .= "Disallow: /admin\n";
        $robots .= "Disallow: /dashboard\n";
        $robots .= "Disallow: /api\n\n";
        $robots .= "Sitemap: {$this->base}/sitemap_index.xml\n";
        File::put("{$public}/robots.txt", $robots);
    }

    private function saveChunk(string $filename, string $body, string $public): void
    {
        File::put("{$public}/{$filename}", $body);
        $this->indexFiles[] = $filename;
        $this->urlCount += substr_count($body, '<url>');
    }

    private function listingPriority(?\Illuminate\Support\Carbon $updatedAt): string
    {
        if (! $updatedAt) {
            return '0.6';
        }
        $days = $updatedAt->diffInDays(now());

        return match (true) {
            $days <= 7 => '0.8',
            $days <= 30 => '0.7',
            default => '0.6',
        };
    }

    private function urlsetOpen(): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
    }

    private function urlEntry(string $loc, string $priority, string $changefreq, ?string $lastmod = null): string
    {
        $xml = "  <url>\n    <loc>".htmlspecialchars($loc, ENT_XML1)."</loc>\n";
        $xml .= "    <changefreq>{$changefreq}</changefreq>\n";
        $xml .= "    <priority>{$priority}</priority>\n";
        if ($lastmod) {
            $xml .= "    <lastmod>{$lastmod}</lastmod>\n";
        }
        $xml .= "  </url>\n";

        return $xml;
    }

    private function sitemapIndexEntry(string $loc, string $lastmod): string
    {
        return '  <sitemap>'
            .'<loc>'.htmlspecialchars($loc, ENT_XML1).'</loc>'
            .'<lastmod>'.htmlspecialchars($lastmod, ENT_XML1).'</lastmod>'
            ."</sitemap>\n";
    }

    private function pageIsNoindex(?string $pageKey, ?string $configRobots): bool
    {
        $robots = $configRobots;
        if ($pageKey) {
            $meta = SeoPageMeta::query()->where('page_key', $pageKey)->value('robots');
            if ($meta) {
                $robots = $meta;
            }
        }

        return $robots && str_contains(strtolower($robots), 'noindex');
    }
}
