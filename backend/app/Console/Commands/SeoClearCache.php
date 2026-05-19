<?php

namespace App\Console\Commands;

use App\Services\Seo\SeoSettingsService;
use Illuminate\Console\Command;

class SeoClearCache extends Command
{
    protected $signature = 'seo:clear-cache';

    protected $description = 'Clear SEO settings cache';

    public function handle(SeoSettingsService $seo): int
    {
        $seo->clearCache();
        $this->info('SEO cache cleared.');

        return self::SUCCESS;
    }
}
