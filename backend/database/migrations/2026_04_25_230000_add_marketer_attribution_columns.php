<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            if (! Schema::hasColumn('visitors', 'first_touch_source')) {
                $table->string('first_touch_source', 100)->nullable()->after('source');
            }
            if (! Schema::hasColumn('visitors', 'last_touch_source')) {
                $table->string('last_touch_source', 100)->nullable()->after('first_touch_source');
            }
            if (! Schema::hasColumn('visitors', 'first_touch_marketer_id')) {
                $table->foreignId('first_touch_marketer_id')->nullable()->after('last_touch_source')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('visitors', 'last_touch_marketer_id')) {
                $table->foreignId('last_touch_marketer_id')->nullable()->after('first_touch_marketer_id')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'referred_by_marketer_id')) {
                $table->foreignId('referred_by_marketer_id')->nullable()->after('how_did_you_hear')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'referred_by_marketer_id')) {
                $table->dropConstrainedForeignId('referred_by_marketer_id');
            }
        });

        Schema::table('visitors', function (Blueprint $table) {
            if (Schema::hasColumn('visitors', 'last_touch_marketer_id')) {
                $table->dropConstrainedForeignId('last_touch_marketer_id');
            }
            if (Schema::hasColumn('visitors', 'first_touch_marketer_id')) {
                $table->dropConstrainedForeignId('first_touch_marketer_id');
            }
            $table->dropColumn(['first_touch_source', 'last_touch_source']);
        });
    }
};
