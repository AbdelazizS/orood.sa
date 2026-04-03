<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->string('tracking_number')->nullable()->after('shipping_address');
            $table->string('carrier')->nullable()->after('tracking_number');
            $table->string('tracking_url')->nullable()->after('carrier');
            $table->string('invoice_url')->nullable()->after('tracking_url');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['tracking_number', 'carrier', 'tracking_url', 'invoice_url']);
        });
    }
};
