<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('contact_phone')->nullable()->after('contact_preferences');
            $table->boolean('contact_by_call')->default(false)->after('contact_phone');
            $table->boolean('free_shipping')->default(false)->after('shipping_details');
            $table->boolean('free_return')->default(false)->after('free_shipping');
            $table->integer('free_return_days')->default(1)->after('free_return');
            $table->boolean('view_at_location')->default(false)->after('free_return_days');
            $table->boolean('show_comments')->default(true)->after('view_at_location');
            $table->foreignId('current_bid_user_id')->nullable()->constrained('users')->nullOnDelete()->after('bids_visible');
            $table->unsignedInteger('view_count')->default(0)->after('current_bid_user_id');
            $table->unsignedInteger('today_view_count')->default(0)->after('view_count');
            $table->unsignedInteger('message_count')->default(0)->after('today_view_count');
            $table->unsignedInteger('daily_view_count')->default(0)->after('message_count');
            $table->integer('shipping_days')->nullable()->after('daily_view_count');
            $table->integer('return_days')->nullable()->after('shipping_days');
            $table->string('location_city')->nullable()->after('return_days');
            $table->decimal('location_lat', 10, 7)->nullable()->after('location_city');
            $table->decimal('location_lng', 10, 7)->nullable()->after('location_lat');
            $table->timestamp('bumped_at')->nullable()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['current_bid_user_id']);
            $table->dropColumn([
                'contact_phone', 'contact_by_call', 'free_shipping', 'free_return',
                'free_return_days', 'view_at_location', 'show_comments',
                'view_count', 'today_view_count', 'message_count', 'daily_view_count',
                'shipping_days', 'return_days', 'location_city', 'location_lat', 'location_lng',
                'bumped_at',
            ]);
        });
    }
};
