<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('group_buys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('target_quantity');
            $table->integer('current_quantity')->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
        });

        Schema::create('group_buy_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('group_buy_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity')->default(1);
            $table->timestamps();
            $table->unique(['user_id', 'group_buy_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_buy_participants');
        Schema::dropIfExists('group_buys');
    }
};
