<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_settings', function (Blueprint $table) {
            $table->id();
            $table->string('support_email')->nullable();
            $table->string('whatsapp')->nullable();
            $table->string('telegram')->nullable();
            $table->string('phone')->nullable();
            $table->text('hours_ar')->nullable();
            $table->text('hours_en')->nullable();
            $table->text('emergency_notice_ar')->nullable();
            $table->text('emergency_notice_en')->nullable();
            $table->json('meta')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('help_categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title_ar');
            $table->string('title_en')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('visible')->default(true);
            $table->string('audience', 32)->default('all');
            $table->timestamps();
        });

        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('help_categories')->nullOnDelete();
            $table->string('slug')->unique();
            $table->string('title_ar');
            $table->string('title_en')->nullable();
            $table->text('summary_ar')->nullable();
            $table->text('summary_en')->nullable();
            $table->boolean('published')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('help_blocks', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 64)->index();
            $table->string('block_type', 64);
            $table->json('config_json');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });

        Schema::create('support_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32);
            $table->string('label_ar');
            $table->string('label_en')->nullable();
            $table->string('value');
            $table->boolean('visible')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('order_edit_policies', function (Blueprint $table) {
            $table->id();
            $table->string('scope', 32)->default('global');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->unsignedSmallInteger('max_text_edits')->default(2);
            $table->unsignedSmallInteger('max_price_edits')->default(0);
            $table->unsignedSmallInteger('edit_window_hours')->default(24);
            $table->boolean('image_edit_requires_approval')->default(true);
            $table->boolean('price_edit_requires_approval')->default(true);
            $table->boolean('auto_approve_text_only')->default(true);
            $table->boolean('active')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('order_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32)->default('pending');
            $table->json('payload_json');
            $table->boolean('requires_admin')->default(false);
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
            $table->index(['purchase_id', 'status']);
        });

        Schema::create('order_edit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_edit_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 64);
            $table->json('before_json')->nullable();
            $table->json('after_json')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_edit_logs');
        Schema::dropIfExists('order_edit_requests');
        Schema::dropIfExists('order_edit_policies');
        Schema::dropIfExists('support_contacts');
        Schema::dropIfExists('help_blocks');
        Schema::dropIfExists('help_articles');
        Schema::dropIfExists('help_categories');
        Schema::dropIfExists('support_settings');
    }
};
