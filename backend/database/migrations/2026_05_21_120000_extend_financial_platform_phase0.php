<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_method_fields', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_method_fields', 'config_json')) {
                $table->json('config_json')->nullable()->after('visible_when');
            }
            if (! Schema::hasColumn('payment_method_fields', 'is_layout_block')) {
                $table->boolean('is_layout_block')->default(false)->after('config_json');
            }
            if (! Schema::hasColumn('payment_method_fields', 'block_style')) {
                $table->string('block_style', 32)->nullable()->after('is_layout_block');
            }
        });

        Schema::table('payment_methods', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_methods', 'processing_time_ar')) {
                $table->string('processing_time_ar')->nullable()->after('instructions');
            }
            if (! Schema::hasColumn('payment_methods', 'processing_time_en')) {
                $table->string('processing_time_en')->nullable()->after('processing_time_ar');
            }
            if (! Schema::hasColumn('payment_methods', 'audience_roles')) {
                $table->json('audience_roles')->nullable()->after('audience');
            }
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('financial_requests', 'submitted_locale')) {
                $table->string('submitted_locale', 8)->nullable()->after('payment_method_id');
            }
            if (! Schema::hasColumn('financial_requests', 'client_meta')) {
                $table->json('client_meta')->nullable()->after('submitted_locale');
            }
        });

        Schema::table('withdrawal_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('withdrawal_requests', 'account_holder')) {
                $table->string('account_holder')->nullable()->after('bank_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('withdrawal_requests', function (Blueprint $table) {
            if (Schema::hasColumn('withdrawal_requests', 'account_holder')) {
                $table->dropColumn('account_holder');
            }
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            $cols = ['submitted_locale', 'client_meta'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('financial_requests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('payment_methods', function (Blueprint $table) {
            foreach (['processing_time_ar', 'processing_time_en', 'audience_roles'] as $col) {
                if (Schema::hasColumn('payment_methods', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('payment_method_fields', function (Blueprint $table) {
            foreach (['config_json', 'is_layout_block', 'block_style'] as $col) {
                if (Schema::hasColumn('payment_method_fields', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
