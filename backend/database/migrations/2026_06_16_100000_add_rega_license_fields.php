<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Saudi REGA rules: a real-estate ad shows its advertising licence number (رقم ترخيص الإعلان),
     * and a brokerage shows its FAL licence (رخصة فال).
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'ad_license_no')) {
                $table->string('ad_license_no', 50)->nullable();
            }
        });
        Schema::table('companies', function (Blueprint $table) {
            if (! Schema::hasColumn('companies', 'fal_license_no')) {
                $table->string('fal_license_no', 50)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'ad_license_no')) {
                $table->dropColumn('ad_license_no');
            }
        });
        Schema::table('companies', function (Blueprint $table) {
            if (Schema::hasColumn('companies', 'fal_license_no')) {
                $table->dropColumn('fal_license_no');
            }
        });
    }
};
