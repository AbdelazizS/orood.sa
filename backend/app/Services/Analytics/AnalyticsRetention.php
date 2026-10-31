<?php

namespace App\Services\Analytics;

use App\Support\DataRetentionSettings;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Deletes detailed analytics events, in small batches.
 *
 * Only these raw-event tables are touched: page_visits, visitors, analytics_search_events.
 * Business records (products, purchases, payments, users, reviews, reports, audit logs…) and the
 * aggregate tables are never deleted. Every day being deleted is aggregated first (final), so
 * the statistics in «ذكاء السوق» always survive.
 */
class AnalyticsRetention
{
    public const RAW_TABLES = ['page_visits', 'visitors', 'analytics_search_events'];

    public function __construct(private AnalyticsAggregator $aggregator)
    {
    }

    /**
     * Automatic policy: everything older than the retention window.
     *
     * @return array{cutoff: string, dry_run: bool, deleted: array<string, int>, aggregated_first: array<int, string>}
     */
    public function prune(bool $dryRun = true): array
    {
        $cutoffDate = $this->aggregator->rawCutoffDate();
        $result = $this->pruneRange(null, $cutoffDate, $dryRun);

        return ['cutoff' => $cutoffDate] + $result;
    }

    /**
     * Delete raw events created on Saudi days [$fromDate, $toDate) — $fromDate null = from the beginning.
     *
     * @return array{dry_run: bool, deleted: array<string, int>, aggregated_first: array<int, string>}
     */
    public function pruneRange(?string $fromDate, string $toDateExclusive, bool $dryRun = true): array
    {
        $tz = $this->aggregator->timezone();
        $start = $fromDate ? CarbonImmutable::parse($fromDate, $tz)->startOfDay()->utc() : null;
        $end = CarbonImmutable::parse($toDateExclusive, $tz)->startOfDay()->utc();
        $scope = function ($q) use ($start, $end) {
            if ($start) {
                $q->where('created_at', '>=', $start);
            }

            return $q->where('created_at', '<', $end);
        };

        // Safety: aggregate (final) every day in the range that has events and isn't final yet.
        $aggregatedFirst = [];
        $oldest = collect(self::RAW_TABLES)->map(fn ($t) => $scope(DB::table($t))->min('created_at'))->filter()->min();
        if ($oldest) {
            $day = CarbonImmutable::parse($oldest, 'UTC')->setTimezone($tz)->startOfDay();
            $finalDays = DB::table('analytics_aggregated_days')->where('events_final', true)->pluck('date')
                ->map(fn ($d) => substr((string) $d, 0, 10))->flip();
            while ($day->toDateString() < $toDateExclusive) {
                $d = $day->toDateString();
                if (! isset($finalDays[$d])) {
                    $aggregatedFirst[] = $d;
                    if (! $dryRun) {
                        $this->aggregator->aggregateDay($d, true, true, true);
                    }
                }
                $day = $day->addDay();
            }
        }

        $deleted = [];
        $batch = (int) config('analytics.cleanup_batch', 1000);
        foreach (self::RAW_TABLES as $table) {
            if ($dryRun) {
                $deleted[$table] = $scope(DB::table($table))->count();

                continue;
            }
            $total = 0;
            do {
                $ids = $scope(DB::table($table))->orderBy('id')->limit($batch)->pluck('id');
                if ($ids->isNotEmpty()) {
                    $total += DB::table($table)->whereIn('id', $ids)->delete();
                }
            } while ($ids->count() === $batch);
            $deleted[$table] = $total;
        }

        if (! $dryRun) {
            $purgedDays = DB::table('analytics_aggregated_days')->where('date', '<', $toDateExclusive)->whereNull('raw_purged_at');
            if ($fromDate) {
                $purgedDays->where('date', '>=', $fromDate);
            }
            $purgedDays->update(['raw_purged_at' => now()]);
        }

        return ['dry_run' => $dryRun, 'deleted' => $deleted, 'aggregated_first' => $aggregatedFirst];
    }

    /** Is automatic cleanup on (admin setting, else config)? */
    public static function autoEnabled(): bool
    {
        return DataRetentionSettings::get()['auto_enabled'];
    }
}
