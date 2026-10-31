<?php

namespace App\Console\Commands;

use App\Services\Analytics\AnalyticsAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Builds the permanent daily analytics. Safe to run any time and repeatedly (each day is recomputed).
 *
 *  analytics:aggregate                    today + the last few days (late events), and sales of days whose orders changed
 *  analytics:aggregate --all              backfill from the oldest stored event (first deploy)
 *  analytics:aggregate --from=2026-01-01  backfill a range
 *  analytics:aggregate --date=2026-10-01  one day
 */
class AnalyticsAggregate extends Command
{
    protected $signature = 'analytics:aggregate {--date=} {--from=} {--to=} {--all : From the oldest stored event}';

    protected $description = 'Aggregate detailed analytics events and orders into permanent daily statistics';

    public function handle(AnalyticsAggregator $aggregator): int
    {
        $runId = DB::table('analytics_job_runs')->insertGetId(['job' => 'aggregate', 'status' => 'running', 'started_at' => now()]);
        $tz = $aggregator->timezone();
        $salesDays = [];

        try {
            if ($this->option('date')) {
                $days = [CarbonImmutable::parse($this->option('date'))->toDateString()];
            } elseif ($this->option('from') || $this->option('all')) {
                if ($this->option('all')) {
                    $oldest = collect([
                        DB::table('page_visits')->min('created_at'),
                        DB::table('analytics_search_events')->min('created_at'),
                        DB::table('purchases')->min('created_at'),
                    ])->filter()->min();
                    $start = $oldest
                        ? CarbonImmutable::parse($oldest, 'UTC')->setTimezone($tz)->startOfDay()
                        : CarbonImmutable::now($tz)->startOfDay();
                } else {
                    $start = CarbonImmutable::parse($this->option('from'), $tz)->startOfDay();
                }
                $end = CarbonImmutable::parse($this->option('to') ?: $aggregator->today(), $tz)->startOfDay();
                $days = [];
                for ($d = $start; $d->lte($end); $d = $d->addDay()) {
                    $days[] = $d->toDateString();
                }
            } else {
                $late = (int) config('analytics.late_days', 2);
                $days = [];
                for ($i = $late; $i >= 0; $i--) {
                    $days[] = CarbonImmutable::now($tz)->subDays($i)->toDateString();
                }
                // Orders placed earlier but completed or cancelled recently change those days' sales.
                $lastRun = DB::table('analytics_job_runs')->where('job', 'aggregate')->where('status', 'ok')->max('started_at');
                $salesDays = $aggregator->daysWithChangedSales($lastRun ? CarbonImmutable::parse($lastRun) : now()->subDay());
            }

            foreach ($days as $day) {
                $aggregator->aggregateDay($day);
            }
            $salesOnly = array_values(array_diff($salesDays, $days));
            foreach ($salesOnly as $day) {
                $aggregator->aggregateDay($day, events: false, sales: true);
            }

            DB::table('analytics_job_runs')->where('id', $runId)->update([
                'status' => 'ok',
                'details' => json_encode(['days' => count($days), 'sales_only_days' => count($salesOnly), 'from' => $days[0] ?? null, 'to' => $days ? end($days) : null]),
                'finished_at' => now(),
            ]);
            $this->info('Aggregated '.count($days).' day(s)'.($salesOnly ? ' + sales of '.count($salesOnly).' earlier day(s)' : '').'.');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::table('analytics_job_runs')->where('id', $runId)->update(['status' => 'failed', 'details' => json_encode(['error' => $e->getMessage()]), 'finished_at' => now()]);
            report($e);
            $this->error('Aggregation failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
