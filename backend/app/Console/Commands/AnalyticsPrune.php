<?php

namespace App\Console\Commands;

use App\Services\Analytics\AnalyticsRetention;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Deletes detailed analytics events older than ANALYTICS_RAW_RETENTION_DAYS (default 75).
 * Preview with --dry-run. Real deletion runs only when ANALYTICS_RETENTION_ENABLED=true (or --force).
 */
class AnalyticsPrune extends Command
{
    protected $signature = 'analytics:prune {--dry-run : Only report what would be deleted} {--force : Run even if retention is disabled}';

    protected $description = 'Delete old detailed analytics events (aggregated statistics are kept)';

    public function handle(AnalyticsRetention $retention): int
    {
        $dry = (bool) $this->option('dry-run');
        if (! $dry && ! AnalyticsRetention::autoEnabled() && ! $this->option('force')) {
            $this->line('Automatic cleanup is off (admin: إدارة البيانات, or ANALYTICS_RETENTION_ENABLED). Preview: php artisan analytics:prune --dry-run');

            return self::SUCCESS;
        }

        $runId = DB::table('analytics_job_runs')->insertGetId(['job' => $dry ? 'prune-dry-run' : 'prune', 'status' => 'running', 'started_at' => now()]);
        try {
            $result = $retention->prune($dry);
            DB::table('analytics_job_runs')->where('id', $runId)->update(['status' => 'ok', 'details' => json_encode($result), 'finished_at' => now()]);
            $this->info(($dry ? '[dry-run] Would delete' : 'Deleted').' events older than '.$result['cutoff'].':');
            foreach ($result['deleted'] as $table => $count) {
                $this->line("  {$table}: {$count}");
            }
            if ($result['aggregated_first']) {
                $this->line('  Days aggregated first: '.count($result['aggregated_first']));
            }

            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::table('analytics_job_runs')->where('id', $runId)->update(['status' => 'failed', 'details' => json_encode(['error' => $e->getMessage()]), 'finished_at' => now()]);
            report($e);
            $this->error('Cleanup failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
