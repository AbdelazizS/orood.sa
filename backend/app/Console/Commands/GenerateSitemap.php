<?php

namespace App\Console\Commands;

use App\Services\Seo\SeoSitemapGenerator;
use Illuminate\Console\Command;

/** @deprecated Use seo:generate-sitemap */
class GenerateSitemap extends Command
{
    protected $signature = 'sitemap:generate {--base-url=}';

    protected $description = 'Alias for seo:generate-sitemap';

    public function handle(SeoSitemapGenerator $generator): int
    {
        $base = $this->option('base-url');
        $result = $generator->generate($base ?: null);
        $this->info('Sitemap generated: '.count($result['files']).' file(s), '.$result['url_count'].' URL(s).');

        return self::SUCCESS;
    }
}
