<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_online')->default(false)->after('verification_level');
            $table->timestamp('last_seen')->nullable()->after('is_online');
            $table->float('rating')->default(0)->after('last_seen');
            $table->unsignedInteger('total_ratings')->default(0)->after('rating');
            $table->unsignedInteger('completed_orders')->default(0)->after('total_ratings');
            $table->string('my_referral_code')->unique()->nullable()->after('completed_orders');
            $table->string('referred_by_code')->nullable()->after('my_referral_code');
        });

        Schema::table('balances', function (Blueprint $table) {
            $table->decimal('withdrawable', 12, 2)->default(0)->after('escrow');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_online', 'last_seen', 'rating', 'total_ratings', 'completed_orders', 'my_referral_code', 'referred_by_code']);
        });
        Schema::table('balances', function (Blueprint $table) {
            $table->dropColumn('withdrawable');
        });
    }
};
