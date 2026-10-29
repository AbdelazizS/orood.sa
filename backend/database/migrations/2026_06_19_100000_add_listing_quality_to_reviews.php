<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * After receiving the order the buyer answers two quick questions, shown on the listing as percentages:
 * «المنتج/الخدمة مطابق للصور» and «سرعة التوصيل/الإنجاز».
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (! Schema::hasColumn('reviews', 'matches_photos')) {
                $table->boolean('matches_photos')->nullable();
            }
            if (! Schema::hasColumn('reviews', 'delivery_speed')) {
                $table->string('delivery_speed', 10)->nullable(); // fast | normal | slow
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['matches_photos', 'delivery_speed']);
        });
    }
};
