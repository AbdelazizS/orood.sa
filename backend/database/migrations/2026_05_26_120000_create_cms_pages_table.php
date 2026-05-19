<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64);
            $table->string('locale', 5)->default('ar');
            $table->string('title');
            $table->longText('body_html')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->string('og_image')->nullable();
            $table->string('canonical')->nullable();
            $table->string('status', 20)->default('published');
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['slug', 'locale']);
            $table->index(['slug', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_pages');
    }
};
