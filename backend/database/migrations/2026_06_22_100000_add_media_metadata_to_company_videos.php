<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** File size + "fast start" processing state for uploaded videos (storage monitoring, playback). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_videos', function (Blueprint $table) {
            if (! Schema::hasColumn('company_videos', 'file_size_kb')) {
                $table->unsignedInteger('file_size_kb')->nullable();
                $table->timestamp('optimized_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('company_videos', function (Blueprint $table) {
            $table->dropColumn(['file_size_kb', 'optimized_at']);
        });
    }
};
