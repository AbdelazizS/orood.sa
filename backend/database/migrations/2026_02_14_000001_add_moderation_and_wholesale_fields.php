<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('banned_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->text('bio')->nullable();
            $table->string('avatar_url')->nullable();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('moderation_status')->default('approved')->after('status');
            $table->decimal('wholesale_price', 12, 2)->nullable()->after('price');
            $table->integer('min_quantity')->nullable()->after('wholesale_price');
            $table->boolean('is_wholesale')->default(false)->after('min_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['banned_at', 'suspended_at', 'bio', 'avatar_url']);
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['moderation_status', 'wholesale_price', 'min_quantity', 'is_wholesale']);
        });
    }
};
