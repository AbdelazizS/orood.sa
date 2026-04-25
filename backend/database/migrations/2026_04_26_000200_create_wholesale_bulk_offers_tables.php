<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wholesale_bulk_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('discount_percent');
            $table->unsignedInteger('min_buyers')->default(3);
            $table->date('valid_until')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->index(['company_id', 'status']);
        });

        Schema::create('wholesale_bulk_offer_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bulk_offer_id')->constrained('wholesale_bulk_offers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['bulk_offer_id', 'product_id'], 'bulk_offer_product_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wholesale_bulk_offer_products');
        Schema::dropIfExists('wholesale_bulk_offers');
    }
};
