<?php

namespace App\Console\Commands;

use App\Services\Seo\SeoSettingsService;
use Illuminate\Console\Command;

class SeoAutoGenerateMeta extends Command
{
    protected $signature = 'seo:auto-generate-meta';

    protected $description = 'Fill empty page meta from categories and static defaults';

    public function handle(SeoSettingsService $seo): int
    {
        $count = $seo->syncCategoryPageMeta();
        $this->info("Synced {$count} category page meta row(s).");

        return self::SUCCESS;
    }
}
