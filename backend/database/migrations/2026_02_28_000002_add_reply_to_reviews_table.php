<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->text('reply_text')->nullable()->after('comment');
            $table->unsignedBigInteger('reply_by')->nullable()->after('reply_text');
            $table->timestamp('replied_at')->nullable()->after('reply_by');

            $table->foreign('reply_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['reply_by']);
            $table->dropColumn(['reply_text', 'reply_by', 'replied_at']);
        });
    }
};
