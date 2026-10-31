<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Market analytics: raw search events (kept 75 days like page_visits / visitors) and permanent daily
 * aggregates that survive the raw-event cleanup. Dimension columns use 0 for "all" so unique keys work.
 * Aggregates hold no personal data (no IPs, no user ids).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Raw: one row per search (page 1 of results). Only the normalised term and filters — no user/IP.
        if (! Schema::hasTable('analytics_search_events')) {
            Schema::create('analytics_search_events', function (Blueprint $table) {
                $table->id();
                $table->string('term', 100);
                $table->unsignedBigInteger('category_id')->default(0);
                $table->unsignedBigInteger('city_id')->default(0);
                $table->unsignedInteger('results_count')->default(0);
                $table->timestamp('created_at')->index();
            });
        }

        // Permanent: per listing per day — views. Snapshot of title / section / city / seller at aggregation
        // time (no foreign keys) so history survives listing deletion or edits.
        if (! Schema::hasTable('analytics_daily_product_views')) {
            Schema::create('analytics_daily_product_views', function (Blueprint $table) {
                $table->id();
                $table->date('date');
                $table->unsignedBigInteger('product_id');
                $table->unsignedInteger('views')->default(0);
                $table->unsignedInteger('unique_viewers')->default(0);
                $table->string('title', 200)->nullable();
                $table->unsignedBigInteger('category_id')->default(0);
                $table->unsignedBigInteger('city_id')->default(0);
                $table->unsignedBigInteger('seller_id')->nullable();
                $table->timestamps();
                $table->unique(['date', 'product_id'], 'adpv_date_product_unique');
                $table->index(['product_id', 'date'], 'adpv_product_date_idx');
            });
        }

        // Permanent: per listing per day (order date) — sales from purchases (source of truth).
        if (! Schema::hasTable('analytics_daily_product_sales')) {
            Schema::create('analytics_daily_product_sales', function (Blueprint $table) {
                $table->id();
                $table->date('date');
                $table->unsignedBigInteger('product_id');
                $table->unsignedInteger('orders')->default(0);
                $table->unsignedInteger('completed_orders')->default(0);
                $table->unsignedInteger('cancelled_orders')->default(0);
                $table->unsignedInteger('refunded_orders')->default(0);
                $table->decimal('completed_revenue', 16, 2)->default(0);
                $table->unsignedInteger('buyers')->default(0);
                $table->string('title', 200)->nullable();
                $table->unsignedBigInteger('category_id')->default(0);
                $table->unsignedBigInteger('city_id')->default(0);
                $table->unsignedBigInteger('seller_id')->nullable();
                $table->timestamps();
                $table->unique(['date', 'product_id'], 'adps_date_product_unique');
                $table->index(['product_id', 'date'], 'adps_product_date_idx');
            });
        }

        // Permanent: per day per city × section (0 = all) — the dashboard's main table.
        if (! Schema::hasTable('analytics_daily_market_stats')) {
            Schema::create('analytics_daily_market_stats', function (Blueprint $table) {
                $table->id();
                $table->date('date');
                $table->unsignedBigInteger('city_id')->default(0);
                $table->unsignedBigInteger('category_id')->default(0);
                $table->unsignedInteger('views')->default(0);
                $table->unsignedInteger('unique_viewers')->default(0);
                $table->unsignedInteger('searches')->default(0);
                $table->unsignedInteger('zero_result_searches')->default(0);
                $table->unsignedInteger('orders')->default(0);
                $table->unsignedInteger('completed_orders')->default(0);
                $table->unsignedInteger('cancelled_orders')->default(0);
                $table->unsignedInteger('refunded_orders')->default(0);
                $table->decimal('completed_revenue', 16, 2)->default(0);
                $table->unsignedInteger('buyers')->default(0);
                $table->timestamps();
                $table->unique(['date', 'city_id', 'category_id'], 'adms_date_city_cat_unique');
                $table->index(['city_id', 'category_id', 'date'], 'adms_dims_date_idx');
            });
        }

        // Permanent: per day per search term (city / section, 0 = all).
        if (! Schema::hasTable('analytics_daily_search_terms')) {
            Schema::create('analytics_daily_search_terms', function (Blueprint $table) {
                $table->id();
                $table->date('date');
                $table->string('term', 100);
                $table->unsignedBigInteger('city_id')->default(0);
                $table->unsignedBigInteger('category_id')->default(0);
                $table->unsignedInteger('searches')->default(0);
                $table->unsignedInteger('zero_result_searches')->default(0);
                $table->timestamps();
                $table->unique(['date', 'term', 'city_id', 'category_id'], 'adst_unique');
                $table->index(['date'], 'adst_date_idx');
            });
        }

        // Bookkeeping: which days are fully aggregated (cleanup only deletes raw events of finalised days).
        if (! Schema::hasTable('analytics_aggregated_days')) {
            Schema::create('analytics_aggregated_days', function (Blueprint $table) {
                $table->date('date')->primary();
                $table->timestamp('events_aggregated_at')->nullable();
                $table->boolean('events_final')->default(false);
                $table->timestamp('sales_aggregated_at')->nullable();
            });
        }

        // Log of aggregation / cleanup runs (results, failures, deleted counts).
        if (! Schema::hasTable('analytics_job_runs')) {
            Schema::create('analytics_job_runs', function (Blueprint $table) {
                $table->id();
                $table->string('job', 40);
                $table->string('status', 20);
                $table->json('details')->nullable();
                $table->timestamp('started_at');
                $table->timestamp('finished_at')->nullable();
                $table->index(['job', 'started_at']);
            });
        }
    }

    public function down(): void
    {
        foreach (['analytics_job_runs', 'analytics_aggregated_days', 'analytics_daily_search_terms', 'analytics_daily_market_stats', 'analytics_daily_product_sales', 'analytics_daily_product_views', 'analytics_search_events'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
