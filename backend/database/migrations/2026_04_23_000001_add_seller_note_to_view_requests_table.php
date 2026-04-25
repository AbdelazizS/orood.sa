<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('view_requests', function (Blueprint $table) {
            $table->string('seller_note', 500)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('view_requests', function (Blueprint $table) {
            $table->dropColumn('seller_note');
        });
    }
};
