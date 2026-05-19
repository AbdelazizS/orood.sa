<?php

namespace App\Console\Commands;

use App\Models\SeoSitemapSetting;
use App\Services\Seo\SeoSettingsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SeoPingSearchEngines extends Command
{
    protected $signature = 'seo:ping-search-engines';

    protected $description = 'Ping Google and Bing with sitemap URL';

    public function handle(SeoSettingsService $seo): int
    {
        $settings = SeoSitemapSetting::current();
        $sitemapUrl = urlencode($seo->siteUrl().'/sitemap_index.xml');

        if ($settings->ping_google) {
            $google = Http::get("https://www.google.com/ping?sitemap={$sitemapUrl}");
            $this->line('Google ping: '.$google->status());
        }

        if ($settings->ping_bing) {
            $bing = Http::get("https://www.bing.com/ping?sitemap={$sitemapUrl}");
            $this->line('Bing ping: '.$bing->status());
        }

        return self::SUCCESS;
    }
}
