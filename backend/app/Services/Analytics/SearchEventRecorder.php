<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\DB;

/**
 * Records one search (raw event, kept 75 days) for demand analytics: the normalised term, the section /
 * city filters and how many results it found. No user, IP or session is stored. Terms that look like
 * personal data (phone numbers, emails) are not stored.
 */
class SearchEventRecorder
{
    public static function normalize(?string $term): ?string
    {
        $t = trim(preg_replace('/\s+/u', ' ', (string) $term) ?? '');
        $t = mb_strtolower($t);
        if ($t === '' || mb_strlen($t) < 2) {
            return null;
        }
        if (str_contains($t, '@') || preg_match('/\d{7,}/', preg_replace('/[\s\-+]/', '', $t) ?? '')) {
            return null;
        }

        return mb_substr($t, 0, 100);
    }

    public static function record(?string $term, ?int $categoryId, ?int $cityId, int $resultsCount): void
    {
        $normalized = self::normalize($term);
        if ($normalized === null) {
            return;
        }
        try {
            DB::table('analytics_search_events')->insert([
                'term' => $normalized,
                'category_id' => (int) ($categoryId ?? 0),
                'city_id' => (int) ($cityId ?? 0),
                'results_count' => max(0, $resultsCount),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Analytics must never break search.
            report($e);
        }
    }
}
