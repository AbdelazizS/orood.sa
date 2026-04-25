<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->default(1)->after('amount');
            $table->text('buyer_note')->nullable()->after('shipping_address');
            $table->timestamp('cod_seller_accepted_at')->nullable()->after('buyer_note');
        });

        DB::table('purchases')
            ->where('payment_method', 'cod')
            ->whereNull('cod_seller_accepted_at')
            ->update(['cod_seller_accepted_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'buyer_note', 'cod_seller_accepted_at']);
        });
    }
};
