<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'payout_activation_status')) {
                $table->string('payout_activation_status', 32)->default('active')->after('status');
            }
        });

        Schema::table('purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('purchases', 'payment_method_id')) {
                $table->foreignId('payment_method_id')->nullable()->after('payment_method')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('purchases', 'cod_policy_accepted_at')) {
                $table->timestamp('cod_policy_accepted_at')->nullable()->after('cod_seller_accepted_at');
            }
        });

        // Default COD off at product level when global policy takes over
        if (Schema::hasColumn('products', 'allow_cod')) {
            \Illuminate\Support\Facades\DB::table('products')->update(['allow_cod' => false]);
        }
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'cod_policy_accepted_at')) {
                $table->dropColumn('cod_policy_accepted_at');
            }
            if (Schema::hasColumn('purchases', 'payment_method_id')) {
                $table->dropForeign(['payment_method_id']);
                $table->dropColumn('payment_method_id');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'payout_activation_status')) {
                $table->dropColumn('payout_activation_status');
            }
        });
    }
};
