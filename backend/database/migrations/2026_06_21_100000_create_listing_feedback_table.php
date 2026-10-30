<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Buyer feedback on a listing (one per person): «مطابق للصور» and «سرعة التوصيل/الإنجاز».
 * From verified buyers (delivered order) or people who dealt with the seller about the listing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('listing_feedback')) {
            return;
        }
        Schema::create('listing_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained('purchases')->nullOnDelete();
            $table->boolean('matches_photos');
            $table->string('delivery_speed', 10); // fast | normal | slow
            $table->string('comment', 500)->nullable();
            $table->boolean('verified_purchase')->default(false);
            $table->boolean('is_hidden')->default(false);
            $table->timestamps();
            $table->unique(['product_id', 'user_id'], 'listing_feedback_product_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_feedback');
    }
};
