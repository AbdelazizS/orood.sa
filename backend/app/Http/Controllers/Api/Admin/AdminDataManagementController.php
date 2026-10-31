<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyVideo;
use App\Services\Analytics\AnalyticsAggregator;
use App\Services\Analytics\AnalyticsRetention;
use App\Services\AuditLogService;
use App\Services\Videos\VideoCleanup;
use App\Support\DataRetentionSettings;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin «إدارة البيانات»: storage overview, automatic cleanup policy, and manual deletion of
 * detailed analytics events or uploaded videos by period — always preview first, then an explicit
 * confirmation (the word «حذف»), and every run is logged with who ran it.
 *
 * Aggregated statistics (market intelligence) and business records are never deleted here.
 */
class AdminDataManagementController extends Controller
{
    public const CONFIRM_WORD = 'حذف';

    private const JOBS = ['prune', 'data-analytics', 'data-videos'];

    public function __construct(
        private AnalyticsAggregator $aggregator,
        private AnalyticsRetention $retention,
        private VideoCleanup $videos,
    ) {
    }

    /** GET /admin/data-management */
    public function index(): JsonResponse
    {
        $settings = DataRetentionSettings::get();
        $tables = [];
        foreach (AnalyticsRetention::RAW_TABLES as $table) {
            $tables[$table] = [
                'count' => DB::table($table)->count(),
                'oldest' => DB::table($table)->min('created_at'),
            ];
        }
        $auto = $this->retention->pruneRange(null, $this->aggregator->rawCutoffDate(), true);

        return response()->json(['data' => [
            'settings' => $settings + [
                'min_days' => DataRetentionSettings::MIN_DAYS,
                'max_days' => DataRetentionSettings::MAX_DAYS,
                'schedule' => '04:00',
                'timezone' => $this->aggregator->timezone(),
            ],
            'analytics' => [
                'tables' => $tables,
                'auto_cutoff' => $this->aggregator->rawCutoffDate(),
                'auto_would_delete' => array_sum($auto['deleted']),
                'aggregated_days' => DB::table('analytics_aggregated_days')->count(),
                'first_aggregated_date' => DB::table('analytics_aggregated_days')->min('date'),
            ],
            'videos' => [
                'count' => CompanyVideo::query()->count(),
                'size_kb' => (int) CompanyVideo::query()->sum('file_size_kb'),
                'hidden' => CompanyVideo::query()->where('status', CompanyVideo::STATUS_HIDDEN)->count(),
                'inactive_listings' => $this->videos->query('inactive_listings', null, CarbonImmutable::now()->addMinute())->count(),
                'oldest' => CompanyVideo::query()->min('created_at'),
            ],
            'runs' => $this->recentRuns(),
        ]]);
    }

    /** PUT /admin/data-management/settings */
    public function updateSettings(Request $request, AuditLogService $audit): JsonResponse
    {
        $validated = $request->validate([
            'auto_enabled' => ['sometimes', 'boolean'],
            'raw_days' => ['sometimes', 'integer', 'min:'.DataRetentionSettings::MIN_DAYS, 'max:'.DataRetentionSettings::MAX_DAYS],
        ]);
        $before = DataRetentionSettings::get();
        $after = DataRetentionSettings::update($validated, $request->user()->id);
        $audit->log('data_retention.settings_updated', null, $before, $after);

        return response()->json(['data' => $after]);
    }

    /** POST /admin/data-management/preview — counts only, nothing is deleted. */
    public function preview(Request $request): JsonResponse
    {
        $params = $this->params($request);

        return response()->json(['data' => $this->run($params, true)]);
    }

    /** POST /admin/data-management/execute — requires confirm: «حذف». */
    public function execute(Request $request, AuditLogService $audit): JsonResponse
    {
        $params = $this->params($request);
        if (trim((string) $request->input('confirm')) !== self::CONFIRM_WORD) {
            throw ValidationException::withMessages(['confirm' => ['اكتب كلمة «'.self::CONFIRM_WORD.'» للتأكيد.']]);
        }

        $user = $request->user();
        $job = $params['target'] === 'videos' ? 'data-videos' : 'data-analytics';
        $actor = ['id' => $user->id, 'name' => $user->name, 'account_number' => $user->account_number ?? null];
        $runId = DB::table('analytics_job_runs')->insertGetId(['job' => $job, 'status' => 'running', 'started_at' => now(),
            'details' => json_encode(['actor' => $actor, 'params' => $this->publicParams($params)], JSON_UNESCAPED_UNICODE)]);

        try {
            $result = $this->run($params, false);
        } catch (\Throwable $e) {
            DB::table('analytics_job_runs')->where('id', $runId)->update(['status' => 'failed', 'finished_at' => now(),
                'details' => json_encode(['actor' => $actor, 'params' => $this->publicParams($params), 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE)]);
            report($e);

            return response()->json(['message' => 'فشل الحذف: '.$e->getMessage()], 500);
        }

        $details = ['actor' => $actor, 'params' => $this->publicParams($params), 'result' => $result];
        DB::table('analytics_job_runs')->where('id', $runId)->update(['status' => 'ok', 'finished_at' => now(),
            'details' => json_encode($details, JSON_UNESCAPED_UNICODE)]);
        $audit->log('data_cleanup.'.$params['target'], null, null, $details);

        return response()->json(['data' => $result + ['run_id' => $runId]]);
    }

    /**
     * Validated request → period boundaries (Saudi days, end exclusive).
     *
     * @return array{target: string, mode: string, scope: string, older_than_days: ?int, from: ?string, to_exclusive: string}
     */
    private function params(Request $request): array
    {
        $v = $request->validate([
            'target' => ['required', 'in:analytics,videos'],
            'mode' => ['required', 'in:older_than,range'],
            'older_than_days' => ['required_if:mode,older_than', 'nullable', 'integer', 'min:1', 'max:3650'],
            'from' => ['required_if:mode,range', 'nullable', 'date'],
            'to' => ['required_if:mode,range', 'nullable', 'date', 'after_or_equal:from'],
            'scope' => ['nullable', 'in:'.implode(',', VideoCleanup::SCOPES)],
        ]);
        $today = CarbonImmutable::parse($this->aggregator->today(), $this->aggregator->timezone());

        if ($v['mode'] === 'older_than') {
            $from = null;
            $toExclusive = $today->subDays((int) $v['older_than_days'])->toDateString();
        } else {
            $from = CarbonImmutable::parse($v['from'])->toDateString();
            $toExclusive = CarbonImmutable::parse($v['to'])->addDay()->toDateString();
        }

        // Recent days are still being aggregated every 15 minutes: their details can't be deleted yet.
        if ($v['target'] === 'analytics') {
            $latest = $today->subDays((int) config('analytics.late_days', 2))->toDateString();
            if ($toExclusive > $latest) {
                throw ValidationException::withMessages(['to' => ['لا يمكن حذف تفاصيل آخر '.((int) config('analytics.late_days', 2) + 1).' أيام (ما زالت تُحتسب). اختر فترة تنتهي قبل '.$latest.'.']]);
            }
        }

        return [
            'target' => $v['target'],
            'mode' => $v['mode'],
            'scope' => $v['scope'] ?? 'inactive_listings',
            'older_than_days' => isset($v['older_than_days']) ? (int) $v['older_than_days'] : null,
            'from' => $from,
            'to_exclusive' => $toExclusive,
        ];
    }

    private function run(array $p, bool $dryRun): array
    {
        $period = ['from' => $p['from'], 'to' => CarbonImmutable::parse($p['to_exclusive'])->subDay()->toDateString()];

        if ($p['target'] === 'analytics') {
            $r = $this->retention->pruneRange($p['from'], $p['to_exclusive'], $dryRun);

            return [
                'target' => 'analytics',
                'dry_run' => $dryRun,
                'period' => $period,
                'tables' => $r['deleted'],
                'total' => array_sum($r['deleted']),
                'days_aggregated_first' => count($r['aggregated_first']),
            ];
        }

        $tz = $this->aggregator->timezone();
        $from = $p['from'] ? CarbonImmutable::parse($p['from'], $tz)->startOfDay()->utc() : null;
        $to = CarbonImmutable::parse($p['to_exclusive'], $tz)->startOfDay()->utc();
        $r = $dryRun ? $this->videos->preview($p['scope'], $from, $to) : $this->videos->execute($p['scope'], $from, $to);

        return ['target' => 'videos', 'dry_run' => $dryRun, 'period' => $period, 'scope' => $p['scope']] + $r
            + ['total' => $dryRun ? $r['count'] : $r['deleted']];
    }

    private function publicParams(array $p): array
    {
        return array_filter([
            'target' => $p['target'],
            'scope' => $p['target'] === 'videos' ? $p['scope'] : null,
            'older_than_days' => $p['older_than_days'],
            'from' => $p['from'],
            'to' => CarbonImmutable::parse($p['to_exclusive'])->subDay()->toDateString(),
        ], fn ($x) => $x !== null);
    }

    private function recentRuns(): array
    {
        return DB::table('analytics_job_runs')->whereIn('job', self::JOBS)
            ->orderByDesc('id')->limit(25)->get()
            ->map(function ($run) {
                $details = json_decode((string) $run->details, true) ?: [];

                return [
                    'id' => $run->id,
                    'job' => $run->job,
                    'status' => $run->status,
                    'started_at' => $run->started_at,
                    'finished_at' => $run->finished_at,
                    'actor' => $details['actor'] ?? null,
                    'params' => $details['params'] ?? (isset($details['cutoff']) ? ['to' => $details['cutoff']] : null),
                    'result' => $details['result'] ?? (isset($details['deleted']) ? ['tables' => $details['deleted'], 'total' => array_sum($details['deleted'])] : null),
                    'error' => $details['error'] ?? null,
                ];
            })->all();
    }
}
