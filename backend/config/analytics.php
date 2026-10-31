<?php

return [
    /*
    | Market analytics (see App\Services\Analytics). Reporting days are calendar days in this timezone
    | (Saudi time); timestamps in the database stay UTC.
    */
    'timezone' => env('ANALYTICS_TIMEZONE', 'Asia/Riyadh'),

    /** Detailed events (page_visits, visitors, analytics_search_events) are kept this many days. */
    'raw_retention_days' => (int) env('ANALYTICS_RAW_RETENTION_DAYS', 75),

    /**
     * The daily cleanup only deletes when this is true. Preview first: php artisan analytics:prune --dry-run
     * Never turned on automatically by a deploy.
     */
    'retention_enabled' => (bool) env('ANALYTICS_RETENTION_ENABLED', false),

    /** Late events: each run re-aggregates this many recent days; a day is final after this many days. */
    'late_days' => (int) env('ANALYTICS_LATE_DAYS', 2),

    /** Orders that count as a completed sale (revenue). Pending / awaiting payment / cancelled never do. */
    'completed_statuses' => ['completed', 'delivered'],

    'cleanup_batch' => 1000,
];
