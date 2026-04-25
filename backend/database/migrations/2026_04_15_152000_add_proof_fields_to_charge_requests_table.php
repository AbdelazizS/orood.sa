<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charge_requests', function (Blueprint $table) {
            $table->string('payer_bank_name', 255)->nullable()->after('payment_method');
            $table->string('transfer_reference', 255)->nullable()->after('payer_bank_name');
            $table->string('receipt_url')->nullable()->after('transfer_reference');
            $table->text('note')->nullable()->after('receipt_url');
            $table->timestamp('submitted_at')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('charge_requests', function (Blueprint $table) {
            $table->dropColumn([
                'payer_bank_name',
                'transfer_reference',
                'receipt_url',
                'note',
                'submitted_at',
            ]);
        });
    }
};
