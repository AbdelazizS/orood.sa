<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_buy_reservations', function (Blueprint $table) {
            if (! Schema::hasColumn('group_buy_reservations', 'checkout_expires_at')) {
                $table->timestamp('checkout_expires_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('group_buy_reservations', 'price_snapshot')) {
                $table->decimal('price_snapshot', 12, 2)->nullable()->after('checkout_expires_at');
            }
            if (! Schema::hasColumn('group_buy_reservations', 'purchase_id')) {
                $table->foreignId('purchase_id')->nullable()->after('price_snapshot')->constrained('purchases')->nullOnDelete();
            }
            if (! Schema::hasColumn('group_buy_reservations', 'purchased_at')) {
                $table->timestamp('purchased_at')->nullable()->after('purchase_id');
            }
            if (! Schema::hasColumn('group_buy_reservations', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('purchased_at');
            }
            if (! Schema::hasColumn('group_buy_reservations', 'completed_notified_at')) {
                $table->timestamp('completed_notified_at')->nullable()->after('cancelled_at');
            }
        });

        Schema::table('purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('purchases', 'group_buy_reservation_id')) {
                $table->foreignId('group_buy_reservation_id')->nullable()->after('bid_id')->constrained('group_buy_reservations')->nullOnDelete();
            }
            if (! Schema::hasColumn('purchases', 'wholesale_unit_price')) {
                $table->decimal('wholesale_unit_price', 12, 2)->nullable()->after('amount');
            }
            if (! Schema::hasColumn('purchases', 'wholesale_discount_percent')) {
                $table->unsignedTinyInteger('wholesale_discount_percent')->nullable()->after('wholesale_unit_price');
            }
            if (! Schema::hasColumn('purchases', 'wholesale_checkout_deadline_at')) {
                $table->timestamp('wholesale_checkout_deadline_at')->nullable()->after('wholesale_discount_percent');
            }
            if (! Schema::hasColumn('purchases', 'wholesale_campaign_completed_at')) {
                $table->timestamp('wholesale_campaign_completed_at')->nullable()->after('wholesale_checkout_deadline_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'group_buy_reservation_id')) {
                $table->dropConstrainedForeignId('group_buy_reservation_id');
            }
            $drop = [];
            foreach ([
                'wholesale_unit_price',
                'wholesale_discount_percent',
                'wholesale_checkout_deadline_at',
                'wholesale_campaign_completed_at',
            ] as $column) {
                if (Schema::hasColumn('purchases', $column)) {
                    $drop[] = $column;
                }
            }
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });

        Schema::table('group_buy_reservations', function (Blueprint $table) {
            if (Schema::hasColumn('group_buy_reservations', 'purchase_id')) {
                $table->dropConstrainedForeignId('purchase_id');
            }
            $drop = [];
            foreach ([
                'checkout_expires_at',
                'price_snapshot',
                'purchased_at',
                'cancelled_at',
                'completed_notified_at',
            ] as $column) {
                if (Schema::hasColumn('group_buy_reservations', $column)) {
                    $drop[] = $column;
                }
            }
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
