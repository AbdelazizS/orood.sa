<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * After an ad expires the listing can be bought again, so a product keeps its ad history
     * (one active ad at a time — enforced in SubscriberAdPurchaseService under a row lock).
     */
    public function up(): void
    {
        // Add the replacement index first: MySQL won't drop an index the product_id foreign key still needs.
        Schema::table('subscriber_listings', function (Blueprint $table) {
            $table->index(['product_id', 'status'], 'subscriber_listings_product_status_idx');
        });
        Schema::table('subscriber_listings', function (Blueprint $table) {
            $table->dropUnique(['product_id']);
        });
    }

    public function down(): void
    {
        Schema::table('subscriber_listings', function (Blueprint $table) {
            $table->unique('product_id');
        });
        Schema::table('subscriber_listings', function (Blueprint $table) {
            $table->dropIndex('subscriber_listings_product_status_idx');
        });
    }
};
