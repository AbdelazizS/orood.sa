<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('seller_payout_profiles')) {
            return;
        }

        Schema::table('seller_payout_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('seller_payout_profiles', 'accept_cod')) {
                $table->boolean('accept_cod')->default(false)->after('primary_mode');
            }
        });

        DB::table('seller_payout_profiles')
            ->where('primary_mode', 'cod_only')
            ->update([
                'primary_mode' => 'platform_wallet',
                'accept_cod' => true,
            ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('seller_payout_profiles')) {
            return;
        }

        Schema::table('seller_payout_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('seller_payout_profiles', 'accept_cod')) {
                $table->dropColumn('accept_cod');
            }
        });
    }
};
