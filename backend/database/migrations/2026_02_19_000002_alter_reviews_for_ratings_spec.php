<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'purchase_id')) {
                $table->foreignId('purchase_id')->nullable()->after('product_id')->constrained('purchases')->nullOnDelete();
            }
            if (!Schema::hasColumn('reviews', 'is_visible')) {
                $table->boolean('is_visible')->default(true)->after('comment');
            }
            if (!Schema::hasColumn('reviews', 'hidden_at')) {
                $table->timestamp('hidden_at')->nullable()->after('is_visible');
            }
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique(['reviewer_id', 'reviewee_id', 'product_id']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->unique(['reviewer_id', 'reviewee_id', 'purchase_id']);
        });

    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique(['reviewer_id', 'reviewee_id', 'purchase_id']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->unique(['reviewer_id', 'reviewee_id', 'product_id']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'purchase_id')) {
                $table->dropConstrainedForeignId('purchase_id');
            }
            if (Schema::hasColumn('reviews', 'is_visible')) {
                $table->dropColumn('is_visible');
            }
            if (Schema::hasColumn('reviews', 'hidden_at')) {
                $table->dropColumn('hidden_at');
            }
        });
    }
};
