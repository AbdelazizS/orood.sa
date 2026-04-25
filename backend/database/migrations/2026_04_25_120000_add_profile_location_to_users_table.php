<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'location_lat')) {
                $table->decimal('location_lat', 10, 7)->nullable()->after('city_id');
            }
            if (!Schema::hasColumn('users', 'location_lng')) {
                $table->decimal('location_lng', 10, 7)->nullable()->after('location_lat');
            }
            if (!Schema::hasColumn('users', 'location_address')) {
                $table->string('location_address', 500)->nullable()->after('location_lng');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $drops = [];
            if (Schema::hasColumn('users', 'location_address')) $drops[] = 'location_address';
            if (Schema::hasColumn('users', 'location_lng')) $drops[] = 'location_lng';
            if (Schema::hasColumn('users', 'location_lat')) $drops[] = 'location_lat';
            if (!empty($drops)) {
                $table->dropColumn($drops);
            }
        });
    }
};
