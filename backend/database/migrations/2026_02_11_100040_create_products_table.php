<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('region_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();

            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->decimal('price', 12, 2)->nullable();
            $table->enum('condition', ['new', 'used'])->default('new');
            $table->string('warranty')->nullable();
            $table->boolean('is_offer')->default(true);
            $table->enum('type', ['offer', 'request'])->default('offer');

            // ✅ Main image URL
            $table->string('image_url')->nullable();

            // Optional JSON fields
            $table->json('contact_preferences')->nullable();
            $table->json('shipping_details')->nullable();
            $table->json('stats')->nullable();
            $table->json('media')->nullable();
            $table->json('tags')->nullable();

            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['type', 'status']);
            $table->index(['category_id', 'subcategory_id']);
            $table->index(['region_id', 'city_id']);
            $table->index('is_offer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};