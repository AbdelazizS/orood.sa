<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('purchases', 'seller_transfer_confirmed_at')) {
                $table->timestamp('seller_transfer_confirmed_at')->nullable()->after('cod_seller_accepted_at');
            }
            if (! Schema::hasColumn('purchases', 'transfer_confirmed_by')) {
                $table->foreignId('transfer_confirmed_by')->nullable()->after('seller_transfer_confirmed_at')
                    ->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('order_edit_policies', function (Blueprint $table) {
            if (! Schema::hasColumn('order_edit_policies', 'max_location_edits')) {
                $table->unsignedSmallInteger('max_location_edits')->default(2)->after('max_price_edits');
            }
            if (! Schema::hasColumn('order_edit_policies', 'location_edit_window_hours')) {
                $table->unsignedSmallInteger('location_edit_window_hours')->default(24)->after('max_location_edits');
            }
            if (! Schema::hasColumn('order_edit_policies', 'location_edit_until_status')) {
                $table->string('location_edit_until_status', 32)->default('shipped')->after('location_edit_window_hours');
            }
            if (! Schema::hasColumn('order_edit_policies', 'location_edit_active')) {
                $table->boolean('location_edit_active')->default(true)->after('location_edit_until_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'transfer_confirmed_by')) {
                $table->dropConstrainedForeignId('transfer_confirmed_by');
            }
            if (Schema::hasColumn('purchases', 'seller_transfer_confirmed_at')) {
                $table->dropColumn('seller_transfer_confirmed_at');
            }
        });

        Schema::table('order_edit_policies', function (Blueprint $table) {
            foreach (['location_edit_active', 'location_edit_until_status', 'location_edit_window_hours', 'max_location_edits'] as $col) {
                if (Schema::hasColumn('order_edit_policies', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
