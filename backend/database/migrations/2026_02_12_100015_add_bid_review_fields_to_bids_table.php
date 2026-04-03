<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bids', function (Blueprint $table) {
            $table->text('note')->nullable()->after('message');
            $table->timestamp('accepted_at')->nullable()->after('note');
            $table->timestamp('rejected_at')->nullable()->after('accepted_at');
            $table->timestamp('withdrawn_at')->nullable()->after('rejected_at');
            $table->unsignedBigInteger('accepted_by')->nullable()->after('withdrawn_at');
        });
    }

    public function down(): void
    {
        Schema::table('bids', function (Blueprint $table) {
            $table->dropColumn(['note', 'accepted_at', 'rejected_at', 'withdrawn_at', 'accepted_by']);
        });
    }
};
