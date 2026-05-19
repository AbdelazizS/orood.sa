<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('service_categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('icon')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('service_providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_category_id')->nullable()->constrained('service_categories')->nullOnDelete();
            $table->string('service_type', 64);
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('cities')->nullable();
            $table->string('pricing_type', 32)->default('quote');
            $table->decimal('price_from', 12, 2)->nullable();
            $table->decimal('price_to', 12, 2)->nullable();
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->boolean('is_available')->default(true);
            $table->string('vehicle_type')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('status', 32)->default('active');
            $table->timestamps();
            $table->unique('user_id');
        });

        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_provider_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32)->default('new');
            $table->text('message')->nullable();
            $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            $table->string('address_text')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('service_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_provider_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_request_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique(['service_provider_id', 'user_id', 'service_request_id']);
        });

        if (Schema::hasTable('service_categories') && DB::table('service_categories')->count() === 0) {
            $now = now();
            DB::table('service_categories')->insert([
                ['slug' => 'moving', 'name_ar' => 'نقل وشحن', 'name_en' => 'Moving & delivery', 'icon' => 'truck', 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
                ['slug' => 'maintenance', 'name_ar' => 'صيانة', 'name_en' => 'Maintenance', 'icon' => 'wrench', 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
                ['slug' => 'cleaning', 'name_ar' => 'تنظيف', 'name_en' => 'Cleaning', 'icon' => 'sparkles', 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('service_reviews');
        Schema::dropIfExists('service_requests');
        Schema::dropIfExists('service_providers');
        Schema::dropIfExists('service_categories');
    }
};
