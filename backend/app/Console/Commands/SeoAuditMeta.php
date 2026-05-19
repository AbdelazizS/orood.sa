<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\SeoAuditLog;
use App\Models\SeoPageMeta;
use App\Services\Seo\SeoSettingsService;
use Illuminate\Console\Command;

class SeoAuditMeta extends Command
{
    protected $signature = 'seo:audit-meta';

    protected $description = 'Scan pages for missing SEO meta and log issues';

    public function handle(SeoSettingsService $seo): int
    {
        $issues = 0;

        $home = $seo->pageMetaByKey('home');
        if (! $home?->seo_title || ! $home?->meta_description) {
            $this->logIssue('home', '/', 'missing_home_meta', 'Homepage title or description missing');
            $issues++;
        }

        SeoPageMeta::query()->where('is_active', true)->get()->each(function (SeoPageMeta $page) use (&$issues) {
            if (! $page->seo_title) {
                $this->logIssue($page->page_key, $page->route_pattern, 'missing_title', 'Missing seo_title');
                $issues++;
            }
            if (! $page->meta_description) {
                $this->logIssue($page->page_key, $page->route_pattern, 'missing_description', 'Missing meta_description');
                $issues++;
            }
        });

        Product::query()
            ->publiclyListed()
            ->where(function ($q) {
                $q->whereNull('title')->orWhere('title', '');
            })
            ->limit(500)
            ->pluck('id')
            ->each(function ($id) use (&$issues) {
                $this->logIssue("product.{$id}", "/products/{$id}", 'missing_product_title', 'Product has no title');
                $issues++;
            });

        $this->info("Audit complete. {$issues} issue(s) logged.");

        return self::SUCCESS;
    }

    private function logIssue(?string $pageKey, ?string $url, string $type, string $details): void
    {
        SeoAuditLog::query()->create([
            'page_key' => $pageKey,
            'page_url' => $url,
            'issue_type' => $type,
            'status' => 'pending',
            'details' => $details,
        ]);
    }
}
