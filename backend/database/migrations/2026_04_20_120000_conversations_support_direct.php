<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('conversation_type', 24)->default('listing')->after('seller_id');
            $table->string('dedupe_key', 96)->nullable()->after('conversation_type');
        });

        // MySQL: FK on product_id uses the composite unique — drop FK and add indexes first.
        Schema::table('conversations', function (Blueprint $table) {
            $table->index('product_id', 'conversations_product_id_index');
            $table->index('buyer_id', 'conversations_buyer_id_index');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique(['product_id', 'buyer_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->change();
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });

        foreach (DB::table('conversations')->whereNull('dedupe_key')->cursor() as $row) {
            if ($row->product_id === null) {
                continue;
            }
            DB::table('conversations')->where('id', $row->id)->update([
                'dedupe_key' => 'listing:'.$row->product_id.':'.$row->buyer_id,
                'conversation_type' => 'listing',
            ]);
        }

        Schema::table('conversations', function (Blueprint $table) {
            $table->unique('dedupe_key');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique(['dedupe_key']);
        });

        DB::table('conversations')->where('conversation_type', 'direct')->delete();

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable(false)->change();
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->index('product_id', 'conversations_product_id_index');
            $table->index('buyer_id', 'conversations_buyer_id_index');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->unique(['product_id', 'buyer_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex('conversations_product_id_index');
            $table->dropIndex('conversations_buyer_id_index');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['conversation_type', 'dedupe_key']);
        });
    }
};
