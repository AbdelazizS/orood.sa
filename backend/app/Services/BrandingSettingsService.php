<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandingSettingsService
{
    public const KEY = 'branding.settings';

    public const ASSET_KEYS = [
        'logo_light',
        'logo_dark',
        'logo_footer',
        'logo_preloader_mark',
        'favicon',
        'app_icon',
    ];

    public const PLACEMENT_KEYS = [
        'navbar',
        'sidebar',
        'footer',
        'preloader',
        'auth',
        'mobile_nav',
    ];

    /** @return array<string, mixed> */
    public function defaults(): array
    {
        return [
            'assets' => [
                'logo_light' => '/logo.png',
                'logo_dark' => '/logo.png',
                'logo_footer' => '/logo.png',
                'logo_preloader_mark' => '/favicon.png',
                'favicon' => '/favicon.png',
                'app_icon' => '/favicon.png',
            ],
            'placements' => [
                'navbar' => [
                    'width_px' => 220,
                    'width_px_desktop' => 280,
                    'max_height_px' => 64,
                    'object_fit' => 'contain',
                    'padding_px' => 2,
                ],
                'sidebar' => [
                    'width_px' => 44,
                    'height_px' => 44,
                    'max_height_px' => 44,
                    'object_fit' => 'contain',
                    'padding_px' => 0,
                ],
                'footer' => [
                    'width_px' => 260,
                    'max_height_px' => 72,
                    'object_fit' => 'contain',
                    'padding_px' => 0,
                ],
                'preloader' => [
                    'width_px' => 120,
                    'max_height_px' => 120,
                    'object_fit' => 'contain',
                    'padding_px' => 0,
                ],
                'auth' => [
                    'width_px' => 200,
                    'max_height_px' => 48,
                    'object_fit' => 'contain',
                    'padding_px' => 8,
                ],
                'mobile_nav' => [
                    'width_px' => 220,
                    'max_height_px' => 64,
                    'object_fit' => 'contain',
                    'padding_px' => 2,
                ],
            ],
            'legal' => [
                'copyright_ar' => 'منصة عروض © {year} — جميع الحقوق محفوظة',
                'copyright_en' => 'Orood Platform © {year} — All rights reserved.',
            ],
            'footer' => [
                'show_developer_credit' => true,
                'developer_name_ar' => 'Aziz',
                'developer_name_en' => 'Aziz',
                'developer_linkedin_url' => 'https://www.linkedin.com/in/abdelaziz-elrasheed-3b1748257',
                'footer_tagline_ar' => 'سوق موثوق للعروض والطلبات وسوق الجملة',
                'footer_tagline_en' => 'Trusted marketplace for offers, requests, and wholesale',
                'violation_notice_ar' => '',
                'violation_notice_en' => '',
            ],
            'transparent_background' => true,
            'preserve_aspect_ratio' => true,
        ];
    }

    /** @return array<string, mixed> */
    public function get(): array
    {
        $stored = AppSetting::getValue(self::KEY, []);
        if (! is_array($stored)) {
            $stored = [];
        }

        return $this->mergeWithDefaults($stored);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(array $data, ?int $updatedBy = null): array
    {
        $current = $this->get();

        if (isset($data['assets']) && is_array($data['assets'])) {
            foreach (self::ASSET_KEYS as $key) {
                if (array_key_exists($key, $data['assets'])) {
                    $val = $data['assets'][$key];
                    $current['assets'][$key] = is_string($val) && trim($val) !== '' ? trim($val) : null;
                }
            }
        }

        if (isset($data['placements']) && is_array($data['placements'])) {
            foreach (self::PLACEMENT_KEYS as $placement) {
                if (isset($data['placements'][$placement]) && is_array($data['placements'][$placement])) {
                    $current['placements'][$placement] = array_merge(
                        $current['placements'][$placement] ?? [],
                        $data['placements'][$placement]
                    );
                }
            }
        }

        if (isset($data['legal']) && is_array($data['legal'])) {
            foreach (['copyright_ar', 'copyright_en'] as $key) {
                if (isset($data['legal'][$key]) && is_string($data['legal'][$key])) {
                    $current['legal'][$key] = trim($data['legal'][$key]);
                }
            }
        }

        if (isset($data['footer']) && is_array($data['footer'])) {
            $footer = &$current['footer'];
            if (array_key_exists('show_developer_credit', $data['footer'])) {
                $footer['show_developer_credit'] = (bool) $data['footer']['show_developer_credit'];
            }
            foreach (['developer_name_ar', 'developer_name_en', 'violation_notice_ar', 'violation_notice_en', 'footer_tagline_ar', 'footer_tagline_en'] as $key) {
                if (isset($data['footer'][$key]) && is_string($data['footer'][$key])) {
                    $footer[$key] = trim($data['footer'][$key]);
                }
            }
            if (isset($data['footer']['developer_linkedin_url']) && is_string($data['footer']['developer_linkedin_url'])) {
                $footer['developer_linkedin_url'] = $this->normalizeLinkedInUrl(trim($data['footer']['developer_linkedin_url']));
            }
        }

        if (array_key_exists('transparent_background', $data)) {
            $current['transparent_background'] = (bool) $data['transparent_background'];
        }

        if (array_key_exists('preserve_aspect_ratio', $data)) {
            $current['preserve_aspect_ratio'] = (bool) $data['preserve_aspect_ratio'];
        }

        if (! empty($data['reset_defaults'])) {
            $defaults = $this->defaults();
            $current['placements'] = $defaults['placements'];
            $current['legal'] = $defaults['legal'];
            $current['footer'] = $defaults['footer'];
            $current['transparent_background'] = $defaults['transparent_background'];
            $current['preserve_aspect_ratio'] = $defaults['preserve_aspect_ratio'];
        }

        AppSetting::putValue(self::KEY, $current, $updatedBy);

        return $this->get();
    }

    /** @return array<string, mixed> */
    public function publicPayload(?string $locale = null): array
    {
        $settings = $this->get();
        $locale = $locale === 'en' ? 'en' : 'ar';

        $assets = [];
        foreach (self::ASSET_KEYS as $key) {
            $assets[$key] = $this->resolveAssetUrl($key, null, $settings);
        }

        $placements = [];
        foreach (self::PLACEMENT_KEYS as $placement) {
            $placements[$placement] = $this->placementStyle($placement, $settings);
        }

        return [
            'assets' => $assets,
            'placements' => $placements,
            'legal' => [
                'copyright_ar' => $settings['legal']['copyright_ar'] ?? '',
                'copyright_en' => $settings['legal']['copyright_en'] ?? '',
                'copyright' => $locale === 'en'
                    ? ($settings['legal']['copyright_en'] ?? '')
                    : ($settings['legal']['copyright_ar'] ?? ''),
            ],
            'footer' => $this->publicFooterPayload($settings, $locale),
            'transparent_background' => (bool) ($settings['transparent_background'] ?? true),
            'preserve_aspect_ratio' => (bool) ($settings['preserve_aspect_ratio'] ?? true),
        ];
    }

    /**
     * Resolve URL for a placement context.
     */
    public function resolveUrlForPlacement(string $placement, ?string $theme = null, ?array $settings = null): string
    {
        $settings ??= $this->get();

        return match ($placement) {
            'sidebar' => $this->resolveFaviconUrl($settings),
            'preloader' => $this->resolvePreloaderMarkUrl($settings),
            'footer' => $this->resolveAssetUrl('logo_footer', $theme, $settings)
                ?: $this->resolveAssetUrl('logo_light', $theme, $settings),
            default => $this->resolveThemedLogo($theme, $settings),
        };
    }

    public function resolveThemedLogo(?string $theme = null, ?array $settings = null): string
    {
        $settings ??= $this->get();
        $isDark = $theme === 'dark';

        if ($isDark) {
            return $this->resolveAssetUrl('logo_dark', $theme, $settings)
                ?: $this->resolveAssetUrl('logo_light', $theme, $settings);
        }

        return $this->resolveAssetUrl('logo_light', $theme, $settings)
            ?: $this->resolveAssetUrl('logo_dark', $theme, $settings);
    }

    public function resolveAssetUrl(string $assetKey, ?string $theme = null, ?array $settings = null): string
    {
        $settings ??= $this->get();
        $raw = $settings['assets'][$assetKey] ?? null;

        if (is_string($raw) && trim($raw) !== '') {
            return trim($raw);
        }

        $defaults = $this->defaults();

        return (string) ($defaults['assets'][$assetKey] ?? '/logo.png');
    }

    /** Sidebar icon — favicon / app icon only. */
    public function resolveFaviconUrl(?array $settings = null): string
    {
        $settings ??= $this->get();
        $assets = $settings['assets'] ?? [];

        foreach (['favicon', 'app_icon'] as $key) {
            $url = $assets[$key] ?? null;
            if ($this->isCustomBrandingUrl($url)) {
                return trim($url);
            }
        }

        return $this->resolveAssetUrl('favicon', null, $settings);
    }

    /** Splash screen — preloader mark upload only. */
    public function resolvePreloaderMarkUrl(?array $settings = null): string
    {
        $settings ??= $this->get();
        $assets = $settings['assets'] ?? [];
        $url = $assets['logo_preloader_mark'] ?? null;

        if ($this->isCustomBrandingUrl($url)) {
            return trim($url);
        }

        return $this->resolveAssetUrl('logo_preloader_mark', null, $settings);
    }

    public function isCustomBrandingUrl(mixed $url): bool
    {
        if (! is_string($url) || trim($url) === '') {
            return false;
        }

        $url = trim($url);

        return str_starts_with($url, '/storage') || str_contains($url, '/branding/');
    }

    /**
     * @return array{width: ?string, height: ?string, maxHeight: ?string, objectFit: string, padding: string}
     */
    public function placementStyle(string $placement, ?array $settings = null): array
    {
        $settings ??= $this->get();
        $p = $settings['placements'][$placement] ?? [];
        $width = isset($p['width_px']) ? (int) $p['width_px'] : null;
        $widthDesktop = isset($p['width_px_desktop']) ? (int) $p['width_px_desktop'] : null;
        $height = isset($p['height_px']) ? (int) $p['height_px'] : null;
        $maxHeight = isset($p['max_height_px']) ? (int) $p['max_height_px'] : null;
        $padding = isset($p['padding_px']) ? (int) $p['padding_px'] : 0;
        $objectFit = in_array($p['object_fit'] ?? 'contain', ['contain', 'cover', 'fill'], true)
            ? $p['object_fit']
            : 'contain';

        return [
            'width' => $this->pxToRem($width),
            'widthDesktop' => $this->pxToRem($widthDesktop),
            'height' => $this->pxToRem($height),
            'maxHeight' => $this->pxToRem($maxHeight),
            'objectFit' => $objectFit,
            'padding' => $this->pxToRem($padding) ?? '0',
        ];
    }

    private function pxToRem(?int $px, int $base = 16): ?string
    {
        if ($px === null || $px <= 0) {
            return null;
        }

        $rem = $px / $base;
        $formatted = abs($rem - round($rem)) < 0.0001
            ? (string) (int) round($rem)
            : rtrim(rtrim(sprintf('%.4f', $rem), '0'), '.');

        return $formatted.'rem';
    }

    public function copyrightLine(?string $locale = null, ?int $year = null): string
    {
        $settings = $this->get();
        $locale = $locale === 'en' ? 'en' : 'ar';
        $year = $year ?? (int) date('Y');
        $template = $locale === 'en'
            ? ($settings['legal']['copyright_en'] ?? '')
            : ($settings['legal']['copyright_ar'] ?? '');

        return str_replace('{year}', (string) $year, $template);
    }

    /**
     * @return array<string, mixed>
     */
    public function publicFooterPayload(array $settings, string $locale): array
    {
        $footer = is_array($settings['footer'] ?? null) ? $settings['footer'] : $this->defaults()['footer'];
        $isEn = $locale === 'en';

        return [
            'show_developer_credit' => (bool) ($footer['show_developer_credit'] ?? true),
            'developer_name' => $isEn
                ? ($footer['developer_name_en'] ?? '')
                : ($footer['developer_name_ar'] ?? ''),
            'developer_linkedin_url' => $footer['developer_linkedin_url'] ?? '',
            'footer_tagline' => $isEn
                ? ($footer['footer_tagline_en'] ?? '')
                : ($footer['footer_tagline_ar'] ?? ''),
            'violation_notice' => $isEn
                ? ($footer['violation_notice_en'] ?? '')
                : ($footer['violation_notice_ar'] ?? ''),
        ];
    }

    public function normalizeLinkedInUrl(string $url): string
    {
        if ($url === '') {
            return '';
        }

        $url = preg_replace('#^https?://sd\.linkedin\.com#i', 'https://www.linkedin.com', $url) ?? $url;

        if (! str_starts_with(strtolower($url), 'http')) {
            $url = 'https://'.$url;
        }

        return $url;
    }

    /**
     * @return array{url: string, path: string, asset_key: string}
     */
    public function storeUpload(UploadedFile $file, string $assetKey): array
    {
        if (! in_array($assetKey, self::ASSET_KEYS, true)) {
            throw new \InvalidArgumentException('Invalid branding asset key.');
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        $name = $assetKey.'-'.Str::uuid().'.'.$ext;
        $path = $file->storeAs('branding', $name, 'public');
        $url = '/storage/'.$path;

        $current = $this->get();
        $current['assets'][$assetKey] = $url;
        AppSetting::putValue(self::KEY, $current);

        return [
            'url' => $url,
            'path' => $path,
            'asset_key' => $assetKey,
        ];
    }

    /**
     * @param  array<string, mixed>  $stored
     * @return array<string, mixed>
     */
    protected function mergeWithDefaults(array $stored): array
    {
        $defaults = $this->defaults();

        $assets = array_merge($defaults['assets'], is_array($stored['assets'] ?? null) ? $stored['assets'] : []);
        foreach ($assets as $k => $v) {
            if ($v === null || $v === '') {
                $assets[$k] = $defaults['assets'][$k] ?? null;
            }
        }

        $placements = $defaults['placements'];
        if (is_array($stored['placements'] ?? null)) {
            foreach ($stored['placements'] as $key => $vals) {
                if (is_array($vals)) {
                    $placements[$key] = array_merge($placements[$key] ?? [], $vals);
                }
            }
        }

        return [
            'assets' => $assets,
            'placements' => $placements,
            'legal' => array_merge($defaults['legal'], is_array($stored['legal'] ?? null) ? $stored['legal'] : []),
            'footer' => array_merge($defaults['footer'], is_array($stored['footer'] ?? null) ? $stored['footer'] : []),
            'transparent_background' => array_key_exists('transparent_background', $stored)
                ? (bool) $stored['transparent_background']
                : $defaults['transparent_background'],
            'preserve_aspect_ratio' => array_key_exists('preserve_aspect_ratio', $stored)
                ? (bool) $stored['preserve_aspect_ratio']
                : $defaults['preserve_aspect_ratio'],
        ];
    }
}
