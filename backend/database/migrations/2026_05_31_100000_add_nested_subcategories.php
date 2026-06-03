<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subcategories', function (Blueprint $table) {
            if (! Schema::hasColumn('subcategories', 'parent_id')) {
                $table->foreignId('parent_id')
                    ->nullable()
                    ->after('category_id')
                    ->constrained('subcategories')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('subcategories', 'sort_order')) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('is_active');
            }
        });

        Schema::table('subcategories', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['category_id', 'slug'], 'subcategories_category_slug_unique');
        });
    }

    public function down(): void
    {
        Schema::table('subcategories', function (Blueprint $table) {
            $table->dropUnique('subcategories_category_slug_unique');
            $table->unique('slug');
        });

        Schema::table('subcategories', function (Blueprint $table) {
            if (Schema::hasColumn('subcategories', 'parent_id')) {
                $table->dropConstrainedForeignId('parent_id');
            }
            if (Schema::hasColumn('subcategories', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
        });
    }
};
