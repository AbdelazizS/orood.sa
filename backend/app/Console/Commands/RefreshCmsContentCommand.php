<?php

namespace App\Console\Commands;

use App\Models\CmsPage;
use Database\Seeders\CmsPagesSeeder;
use Illuminate\Console\Command;

class RefreshCmsContentCommand extends Command
{
    protected $signature = 'cms:refresh-content';

    protected $description = 'Refresh CMS legal/help page HTML from CmsPagesSeeder';

    public function handle(): int
    {
        $this->call('db:seed', ['--class' => CmsPagesSeeder::class, '--force' => true]);

        $pattern = '/\b(?:legal|privacy|refunds|partnerships|info|support)@arooth\.com(?:\s*·\s*info@arooth\.com)?/i';
        $stripped = 0;
        CmsPage::query()->each(function (CmsPage $page) use ($pattern, &$stripped) {
            $html = (string) ($page->body_html ?? '');
            if ($html === '' || ! preg_match($pattern, $html)) {
                return;
            }
            $clean = preg_replace(
                '/<p[^>]*>\s*(?:legal|privacy|refunds|partnerships|info|support)@arooth\.com(?:\s*·\s*info@arooth\.com)?\s*<\/p>/i',
                '',
                $html,
            );
            $clean = preg_replace($pattern, '', (string) $clean);
            $page->update(['body_html' => trim((string) $clean)]);
            $stripped++;
        });

        $this->info('CMS page content refreshed.'.($stripped > 0 ? " Stripped placeholder emails from {$stripped} page(s)." : ''));

        return self::SUCCESS;
    }
}
