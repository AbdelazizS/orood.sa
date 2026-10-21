<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'marketing_status')) {
                $table->string('marketing_status', 24)->nullable()->after('moderation_status');
                $table->index('marketing_status', 'products_marketing_status_idx');
            }
            if (! Schema::hasColumn('products', 'district')) {
                $table->string('district', 120)->nullable()->after('location_address');
                $table->index('district', 'products_district_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'marketing_status')) {
                $table->dropIndex('products_marketing_status_idx');
                $table->dropColumn('marketing_status');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'district')) {
                $table->dropIndex('products_district_idx');
                $table->dropColumn('district');
            }
        });
    }
};
