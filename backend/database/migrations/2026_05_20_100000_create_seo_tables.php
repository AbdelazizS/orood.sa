<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_global_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key')->unique();
            $table->text('setting_value')->nullable();
            $table->timestamps();
        });

        Schema::create('seo_page_meta', function (Blueprint $table) {
            $table->id();
            $table->string('page_key')->unique();
            $table->string('route_pattern')->nullable();
            $table->string('page_type', 40)->default('static');
            $table->string('seo_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('meta_keywords', 500)->nullable();
            $table->string('canonical_url', 500)->nullable();
            $table->string('robots', 80)->default('index,follow');
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->string('og_image', 500)->nullable();
            $table->string('og_type', 40)->default('website');
            $table->string('twitter_card', 40)->default('summary_large_image');
            $table->decimal('priority', 2, 1)->default(0.5);
            $table->string('changefreq', 20)->default('weekly');
            $table->json('custom_schema')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('seo_sitemap_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('include_main')->default(true);
            $table->boolean('include_categories')->default(true);
            $table->boolean('include_subcategories')->default(true);
            $table->boolean('include_offers')->default(true);
            $table->boolean('include_requests')->default(true);
            $table->boolean('include_wholesale')->default(true);
            $table->boolean('include_companies')->default(true);
            $table->boolean('include_cities')->default(false);
            $table->boolean('include_profiles')->default(false);
            $table->unsignedInteger('urls_per_file')->default(50000);
            $table->boolean('auto_generate')->default(true);
            $table->time('generation_time')->default('02:00:00');
            $table->boolean('ping_google')->default(true);
            $table->boolean('ping_bing')->default(true);
            $table->text('robots_txt')->nullable();
            $table->timestamp('last_generated_at')->nullable();
            $table->unsignedInteger('last_url_count')->nullable();
            $table->timestamps();
        });

        Schema::create('seo_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('page_url', 500)->nullable();
            $table->string('page_key')->nullable();
            $table->string('issue_type', 60);
            $table->string('status', 20)->default('pending');
            $table->text('details')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'issue_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_audit_logs');
        Schema::dropIfExists('seo_sitemap_settings');
        Schema::dropIfExists('seo_page_meta');
        Schema::dropIfExists('seo_global_settings');
    }
};
