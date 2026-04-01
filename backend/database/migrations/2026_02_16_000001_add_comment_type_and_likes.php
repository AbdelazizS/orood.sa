<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->string('type')->default('REGULAR')->after('body');
            $table->decimal('bid_amount', 12, 2)->nullable()->after('type');
            $table->unsignedInteger('likes')->default(0)->after('bid_amount');
            $table->unsignedInteger('dislikes')->default(0)->after('likes');
        });

        Schema::create('comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_like');
            $table->timestamps();
            $table->unique(['comment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->dropColumn(['type', 'bid_amount', 'likes', 'dislikes']);
        });
        Schema::dropIfExists('comment_likes');
    }
};
