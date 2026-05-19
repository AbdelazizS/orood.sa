<?php

namespace App\Console\Commands;

use App\Services\Seo\SeoSitemapGenerator;
use Illuminate\Console\Command;

class SeoGenerateSitemap extends Command
{
    protected $signature = 'seo:generate-sitemap {--base-url=}';

    protected $description = 'Generate multi-file SEO sitemaps';

    public function handle(SeoSitemapGenerator $generator): int
    {
        $base = $this->option('base-url');
        $result = $generator->generate($base ?: null);

        $this->info('Generated '.count($result['files']).' sitemap file(s), '.$result['url_count'].' URL(s).');

        return self::SUCCESS;
    }
}
