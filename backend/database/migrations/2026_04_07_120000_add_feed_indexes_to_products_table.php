<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index(['status', 'moderation_status', 'published_at'], 'products_feed_status_published_idx');
            $table->index(['type', 'status', 'published_at'], 'products_feed_type_status_published_idx');
            $table->index(['category_id', 'region_id', 'city_id'], 'products_feed_tax_geo_idx');
            $table->index(['status', 'price'], 'products_feed_price_idx');
            $table->index(['status', 'view_count'], 'products_feed_views_idx');
            $table->index(['status', 'sold_count'], 'products_feed_sold_idx');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_feed_status_published_idx');
            $table->dropIndex('products_feed_type_status_published_idx');
            $table->dropIndex('products_feed_tax_geo_idx');
            $table->dropIndex('products_feed_price_idx');
            $table->dropIndex('products_feed_views_idx');
            $table->dropIndex('products_feed_sold_idx');
        });
    }
};
