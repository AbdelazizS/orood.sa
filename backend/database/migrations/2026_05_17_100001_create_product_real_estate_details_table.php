<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_real_estate_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('purpose', 16); // sale, rent
            $table->string('property_type', 32); // apartment, villa, land, building, floor, shop, farm
            $table->decimal('area_sqm', 12, 2)->nullable();
            $table->unsignedSmallInteger('bedrooms')->nullable();
            $table->unsignedSmallInteger('bathrooms')->nullable();
            $table->decimal('land_width_m', 10, 2)->nullable();
            $table->decimal('land_length_m', 10, 2)->nullable();
            $table->decimal('street_width_m', 10, 2)->nullable();
            $table->unsignedSmallInteger('property_age_years')->nullable();
            $table->boolean('furnished')->default(false);
            $table->unsignedSmallInteger('floor_number')->nullable();
            $table->unsignedSmallInteger('total_floors')->nullable();
            $table->json('amenities')->nullable();
            $table->timestamps();

            $table->index(['purpose', 'property_type']);
            $table->index('area_sqm');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_real_estate_details');
    }
};
