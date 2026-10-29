<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** When a listing was auto-expired for age (listings:expire-old) — used to free its video files later. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'expired_at')) {
            Schema::table('products', function (Blueprint $table) {
                $table->timestamp('expired_at')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['expired_at']);
            $table->dropColumn('expired_at');
        });
    }
};
