<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_buy_reservations', function (Blueprint $table) {
            $table->index(['product_id', 'status'], 'gbr_product_status_idx');
            $table->index('user_id', 'gbr_user_idx');
        });

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'discount_percent')) {
                $table->unsignedTinyInteger('discount_percent')->default(0)->after('wholesale_price');
            }
            if (! Schema::hasColumn('products', 'wholesale_expires_at')) {
                $table->timestamp('wholesale_expires_at')->nullable()->after('discount_percent');
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_buy_reservations', function (Blueprint $table) {
            $table->dropIndex('gbr_product_status_idx');
            $table->dropIndex('gbr_user_idx');
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'wholesale_expires_at')) {
                $table->dropColumn('wholesale_expires_at');
            }
            if (Schema::hasColumn('products', 'discount_percent')) {
                $table->dropColumn('discount_percent');
            }
        });
    }
};
