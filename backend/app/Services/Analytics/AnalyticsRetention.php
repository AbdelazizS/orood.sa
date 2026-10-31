<?php

namespace App\Services\Analytics;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Deletes detailed analytics events older than the retention window (default 75 days), in small batches.
 *
 * Only these raw-event tables are touched: page_visits, visitors, analytics_search_events.
 * Business records (products, purchases, payments, users, reviews, reports, audit logs…) and the
 * aggregate tables are never deleted. Raw events of a day are deleted only after that day has been
 * aggregated as final, so historical statistics always survive.
 */
class AnalyticsRetention
{
    public const RAW_TABLES = ['page_visits', 'visitors', 'analytics_search_events'];

    public function __construct(private AnalyticsAggregator $aggregator)
    {
    }

    /**
     * @return array{cutoff: string, dry_run: bool, deleted: array<string, int>, aggregated_first: array<int, string>}
     */
    public function prune(bool $dryRun = true): array
    {
        $tz = $this->aggregator->timezone();
        $cutoffDate = $this->aggregator->rawCutoffDate();
        $cutoff = CarbonImmutable::parse($cutoffDate, $tz)->startOfDay()->utc();

        // Safety: every day being deleted must have final aggregates — aggregate any that don't yet.
        $aggregatedFirst = [];
        $oldest = collect(self::RAW_TABLES)
            ->map(fn ($t) => DB::table($t)->where('created_at', '<', $cutoff)->min('created_at'))
            ->filter()->min();
        if ($oldest) {
            $day = CarbonImmutable::parse($oldest, 'UTC')->setTimezone($tz)->startOfDay();
            $finalDays = DB::table('analytics_aggregated_days')->where('events_final', true)->pluck('date')
                ->map(fn ($d) => substr((string) $d, 0, 10))->flip();
            while ($day->toDateString() < $cutoffDate) {
                $d = $day->toDateString();
                if (! isset($finalDays[$d])) {
                    $aggregatedFirst[] = $d;
                    if (! $dryRun) {
                        // Events are still present (not deleted yet), so aggregate them directly.
                        $this->aggregateOldDay($d);
                    }
                }
                $day = $day->addDay();
            }
        }

        $deleted = [];
        $batch = (int) config('analytics.cleanup_batch', 1000);
        foreach (self::RAW_TABLES as $table) {
            if ($dryRun) {
                $deleted[$table] = DB::table($table)->where('created_at', '<', $cutoff)->count();

                continue;
            }
            $total = 0;
            do {
                $ids = DB::table($table)->where('created_at', '<', $cutoff)->orderBy('id')->limit($batch)->pluck('id');
                if ($ids->isNotEmpty()) {
                    $total += DB::table($table)->whereIn('id', $ids)->delete();
                }
            } while ($ids->count() === $batch);
            $deleted[$table] = $total;
        }

        return ['cutoff' => $cutoffDate, 'dry_run' => $dryRun, 'deleted' => $deleted, 'aggregated_first' => $aggregatedFirst];
    }

    /** Aggregate a day that is already outside the normal window (its raw events still exist). */
    private function aggregateOldDay(string $date): void
    {
        $this->aggregator->aggregateDay($date, true, true, true);
    }
}
