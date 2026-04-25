<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('view_requests', function (Blueprint $table) {
            $table->string('location_place_id', 255)->nullable()->after('location_address');
        });
    }

    public function down(): void
    {
        Schema::table('view_requests', function (Blueprint $table) {
            $table->dropColumn('location_place_id');
        });
    }
};
