<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('page_visits', function (Blueprint $table) {
            if (Schema::hasColumn('page_visits', 'updated_at')) {
                $table->dropColumn('updated_at');
            }
            if (!Schema::hasColumn('page_visits', 'user_agent')) {
                $table->string('user_agent', 300)->nullable()->after('source');
            }
        });

        Schema::table('page_visits', function (Blueprint $table) {
            $table->index(['profile_id', 'created_at']);
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('page_visits', function (Blueprint $table) {
            $table->dropIndex(['profile_id', 'created_at']);
            $table->dropIndex(['product_id', 'created_at']);
        });

        Schema::table('page_visits', function (Blueprint $table) {
            if (Schema::hasColumn('page_visits', 'user_agent')) {
                $table->dropColumn('user_agent');
            }
        });

        Schema::table('page_visits', function (Blueprint $table) {
            $table->timestamp('updated_at')->nullable();
        });
    }
};
