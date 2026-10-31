<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * Admin-controlled retention (Settings -> data management). Falls back to config/analytics.php.
 */
class DataRetentionSettings
{
    public const KEY = 'data.retention';

    public const MIN_DAYS = 30;

    public const MAX_DAYS = 1825;

    /** @return array{auto_enabled: bool, raw_days: int} */
    public static function get(): array
    {
        $stored = AppSetting::getValue(self::KEY, []);
        $stored = is_array($stored) ? $stored : [];

        return [
            'auto_enabled' => array_key_exists('auto_enabled', $stored)
                ? (bool) $stored['auto_enabled']
                : (bool) config('analytics.retention_enabled', false),
            'raw_days' => max(self::MIN_DAYS, min(self::MAX_DAYS, (int) ($stored['raw_days'] ?? config('analytics.raw_retention_days', 75)))),
        ];
    }

    /** @param  array{auto_enabled?: bool, raw_days?: int}  $changes */
    public static function update(array $changes, ?int $updatedBy = null): array
    {
        $next = array_merge(self::get(), array_intersect_key($changes, array_flip(['auto_enabled', 'raw_days'])));
        $next['auto_enabled'] = (bool) $next['auto_enabled'];
        $next['raw_days'] = max(self::MIN_DAYS, min(self::MAX_DAYS, (int) $next['raw_days']));
        AppSetting::putValue(self::KEY, $next, $updatedBy);

        return $next;
    }
}
