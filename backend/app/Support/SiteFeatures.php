<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * Simple on/off switches the admin controls from Settings (e.g. the homepage «سوق الجملة» button).
 */
class SiteFeatures
{
    public const KEY = 'site.features';

    /** @var array<string, bool> */
    public const DEFAULTS = [
        // Hidden until the admin turns it on (client note 2026-10).
        'show_wholesale_button' => false,
    ];

    /** @return array<string, bool> */
    public static function all(): array
    {
        $stored = AppSetting::getValue(self::KEY, []);
        $stored = is_array($stored) ? $stored : [];

        $out = [];
        foreach (self::DEFAULTS as $key => $default) {
            $out[$key] = array_key_exists($key, $stored) ? (bool) $stored[$key] : $default;
        }

        return $out;
    }

    /** @param  array<string, mixed>  $changes */
    public static function update(array $changes, ?int $updatedBy = null): array
    {
        $next = self::all();
        foreach ($changes as $key => $value) {
            if (array_key_exists($key, self::DEFAULTS)) {
                $next[$key] = (bool) $value;
            }
        }
        AppSetting::putValue(self::KEY, $next, $updatedBy);

        return $next;
    }
}
