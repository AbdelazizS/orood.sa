<?php

namespace App\Console\Commands;

use App\Services\BrandingSettingsService;
use App\Services\Seo\SeoSettingsService;
use Illuminate\Console\Command;

class SyncFrontendMetaCommand extends Command
{
    protected $signature = 'frontend:sync-meta';

    protected $description = 'Patch frontend index.html (source + dist) with SEO OG tags and branding favicon for crawlers';

    public function handle(SeoSettingsService $seo, BrandingSettingsService $branding): int
    {
        $resolved = $seo->resolveForPath('/', 'ar', []);
        $og = $resolved['og'] ?? [];
        $title = (string) ($resolved['title'] ?? 'عروض Arooth');
        $description = (string) ($resolved['description'] ?? '');
        $ogImage = (string) ($og['image'] ?? $seo->siteUrl().'/logo.png');
        $canonical = (string) ($resolved['canonical'] ?? $seo->siteUrl().'/');
        $siteName = (string) ($og['site_name'] ?? 'عروض Arooth');

        $assets = $branding->publicPayload('ar')['assets'] ?? [];
        $faviconPath = (string) ($assets['favicon'] ?? '/favicon.png');
        $faviconHref = $this->absoluteUrl($seo, $faviconPath);

        $paths = [
            base_path('../frontend/index.html'),
            base_path('../frontend/dist/index.html'),
        ];

        $patched = 0;
        foreach ($paths as $path) {
            if (! is_file($path)) {
                continue;
            }
            $html = (string) file_get_contents($path);
            $html = $this->patchHtml($html, [
                'title' => $title,
                'description' => $description,
                'canonical' => $canonical,
                'og_title' => (string) ($og['title'] ?? $title),
                'og_description' => (string) ($og['description'] ?? $description),
                'og_image' => $ogImage,
                'og_url' => $canonical,
                'og_site_name' => $siteName,
                'favicon' => $faviconHref,
                'apple_touch' => $this->absoluteUrl($seo, (string) ($assets['app_icon'] ?? $faviconPath)),
            ]);
            file_put_contents($path, $html);
            $patched++;
            $this->line("Patched: {$path}");
        }

        if ($patched === 0) {
            $this->warn('No index.html found. Run from backend/ after frontend exists.');

            return self::FAILURE;
        }

        $this->info('Frontend meta synced. Rebuild frontend if you only patched source index.html.');

        return self::SUCCESS;
    }

    /** @param array<string, string> $meta */
    private function patchHtml(string $html, array $meta): string
    {
        $esc = fn (string $v) => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $html = preg_replace('/<title>.*?<\/title>/s', '<title>'.$esc($meta['title']).'</title>', $html, 1) ?? $html;
        $html = $this->replaceMetaContent($html, 'name', 'description', $meta['description']);
        $html = $this->replaceLinkHref($html, 'canonical', $meta['canonical']);
        $html = $this->replaceLinkHref($html, 'icon', $meta['favicon']);
        $html = $this->replaceLinkHref($html, 'apple-touch-icon', $meta['apple_touch']);
        $html = $this->replaceMetaContent($html, 'property', 'og:title', $meta['og_title']);
        $html = $this->replaceMetaContent($html, 'property', 'og:description', $meta['og_description']);
        $html = $this->replaceMetaContent($html, 'property', 'og:url', $meta['og_url']);
        $html = $this->replaceMetaContent($html, 'property', 'og:image', $meta['og_image']);
        $html = $this->replaceMetaContent($html, 'property', 'og:site_name', $meta['og_site_name']);
        $html = $this->replaceMetaContent($html, 'name', 'twitter:title', $meta['og_title']);
        $html = $this->replaceMetaContent($html, 'name', 'twitter:description', $meta['og_description']);
        $html = $this->replaceMetaContent($html, 'name', 'twitter:image', $meta['og_image']);

        $logoJson = $esc($meta['og_image']);
        $html = preg_replace(
            '/"logo":\s*"[^"]*"/',
            '"logo": "'.$logoJson.'"',
            $html,
            1,
        ) ?? $html;

        return $html;
    }

    private function replaceMetaContent(string $html, string $attr, string $key, string $value): string
    {
        $esc = htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $pattern = '/<meta\s+'.$attr.'="'.$key.'"[^>]*content="[^"]*"[^>]*\/?>/i';
        $replacement = '<meta '.$attr.'="'.$key.'" content="'.$esc.'" />';

        if (preg_match($pattern, $html)) {
            return (string) preg_replace($pattern, $replacement, $html, 1);
        }

        return $html;
    }

    private function replaceLinkHref(string $html, string $rel, string $href): string
    {
        $esc = htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $pattern = '/<link\s+rel="'.preg_quote($rel, '/').'"[^>]*href="[^"]*"[^>]*\/?>/i';
        $replacement = '<link rel="'.$rel.'" href="'.$esc.'" />';

        if (preg_match($pattern, $html)) {
            return (string) preg_replace($pattern, $replacement, $html, 1);
        }

        return $html;
    }

    private function absoluteUrl(SeoSettingsService $seo, string $path): string
    {
        $base = $seo->siteUrl();
        if ($path === '' || str_starts_with($path, 'http')) {
            return $path !== '' ? $path : $base.'/favicon.png';
        }

        return $base.'/'.ltrim($path, '/');
    }
}
