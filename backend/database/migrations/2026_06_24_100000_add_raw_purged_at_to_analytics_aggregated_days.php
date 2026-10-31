<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marks days whose detailed events were deleted, so their aggregated numbers are never
     * recomputed from the (now empty) raw tables.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('analytics_aggregated_days', 'raw_purged_at')) {
            Schema::table('analytics_aggregated_days', function (Blueprint $table) {
                $table->timestamp('raw_purged_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('analytics_aggregated_days', 'raw_purged_at')) {
            Schema::table('analytics_aggregated_days', function (Blueprint $table) {
                $table->dropColumn('raw_purged_at');
            });
        }
    }
};
