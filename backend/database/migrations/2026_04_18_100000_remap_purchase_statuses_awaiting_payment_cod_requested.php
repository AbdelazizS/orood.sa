<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('purchases')
            ->where('payment_method', 'escrow')
            ->where('status', 'paid')
            ->update(['status' => 'awaiting_payment']);

        DB::table('purchases')
            ->where('payment_method', 'cod')
            ->where('status', 'pending')
            ->whereNull('cod_seller_accepted_at')
            ->update(['status' => 'cod_requested']);
    }

    public function down(): void
    {
        DB::table('purchases')
            ->where('payment_method', 'escrow')
            ->where('status', 'awaiting_payment')
            ->update(['status' => 'paid']);

        DB::table('purchases')
            ->where('payment_method', 'cod')
            ->where('status', 'cod_requested')
            ->update(['status' => 'pending']);
    }
};
