<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name_ar');
            $table->string('name_en')->nullable();
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->string('audience', 16)->default('both'); // buyer, seller, both
            $table->boolean('enabled')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('requires_admin_review')->default(true);
            $table->boolean('requires_seller_payout_profile')->default(false);
            $table->boolean('requires_buyer_acknowledgement')->default(false);
            $table->decimal('min_amount', 12, 2)->nullable();
            $table->decimal('max_amount', 12, 2)->nullable();
            $table->json('instructions')->nullable();
            $table->json('config')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_method_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_method_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('context', 64); // charge, withdraw, payout_profile, order_payment, guarantee_deposit
            $table->string('field_key', 64);
            $table->string('field_type', 32);
            $table->string('label_ar');
            $table->string('label_en')->nullable();
            $table->string('placeholder_ar')->nullable();
            $table->string('placeholder_en')->nullable();
            $table->text('help_ar')->nullable();
            $table->text('help_en')->nullable();
            $table->boolean('required')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->json('validation_rules')->nullable();
            $table->json('options')->nullable();
            $table->json('visible_when')->nullable();
            $table->timestamps();

            $table->unique(['payment_method_id', 'context', 'field_key'], 'pmf_context_key_unique');
            $table->index(['context', 'payment_method_id']);
        });

        Schema::create('financial_requests', function (Blueprint $table) {
            $table->id();
            $table->string('type', 64);
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('related');
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 8)->default('SAR');
            $table->string('status', 32)->default('pending');
            $table->string('idempotency_key', 191)->nullable();
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('rejection_reason')->nullable();
            $table->text('admin_internal_note')->nullable();
            $table->unsignedBigInteger('legacy_charge_request_id')->nullable();
            $table->unsignedBigInteger('legacy_withdrawal_request_id')->nullable();
            $table->unsignedBigInteger('legacy_guarantee_request_id')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index(['user_id', 'status']);
            $table->unique(['user_id', 'idempotency_key'], 'fr_user_idempotency');
        });

        Schema::create('financial_request_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('financial_request_id')->constrained()->cascadeOnDelete();
            $table->string('field_key', 64);
            $table->text('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->string('file_url', 500)->nullable();
            $table->timestamps();

            $table->index(['financial_request_id', 'field_key']);
        });

        Schema::create('financial_request_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('financial_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 64);
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['financial_request_id', 'created_at']);
        });

        Schema::create('seller_payout_profiles', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('primary_mode', 32)->nullable(); // platform_wallet, direct_bank, cod_only
            $table->string('status', 32)->default('incomplete');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('seller_payout_profile_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_field_id')->nullable()->constrained()->nullOnDelete();
            $table->string('field_key', 64);
            $table->text('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->string('file_url', 500)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'field_key']);
        });

        Schema::create('cod_policies', function (Blueprint $table) {
            $table->id();
            $table->string('scope', 32); // global, category, city, seller
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->boolean('enabled')->default(false);
            $table->boolean('buyer_must_accept')->default(true);
            $table->boolean('seller_can_toggle')->default(true);
            $table->unsignedSmallInteger('priority')->default(0);
            $table->timestamps();

            $table->index(['scope', 'scope_id']);
        });

        Schema::create('cod_policy_acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('accepted_at');
            $table->json('policy_snapshot')->nullable();
            $table->timestamps();

            $table->unique('purchase_id');
        });

        Schema::create('order_payment_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32)->default('pending');
            $table->decimal('amount', 12, 2);
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->text('admin_internal_note')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::create('order_payment_request_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_payment_request_id')->constrained()->cascadeOnDelete();
            $table->string('field_key', 64);
            $table->text('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->string('file_url', 500)->nullable();
            $table->timestamps();
        });

        Schema::create('category_field_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('field_key', 64);
            $table->string('field_type', 32);
            $table->string('label_ar');
            $table->string('label_en')->nullable();
            $table->json('validation_rules')->nullable();
            $table->json('options')->nullable();
            $table->boolean('filterable')->default(false);
            $table->boolean('show_on_card')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['category_id', 'subcategory_id']);
        });

        Schema::create('listing_attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_field_definition_id')->constrained()->cascadeOnDelete();
            $table->text('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'category_field_definition_id'], 'listing_attr_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_attribute_values');
        Schema::dropIfExists('category_field_definitions');
        Schema::dropIfExists('order_payment_request_values');
        Schema::dropIfExists('order_payment_requests');
        Schema::dropIfExists('cod_policy_acceptances');
        Schema::dropIfExists('cod_policies');
        Schema::dropIfExists('seller_payout_profile_values');
        Schema::dropIfExists('seller_payout_profiles');
        Schema::dropIfExists('financial_request_events');
        Schema::dropIfExists('financial_request_values');
        Schema::dropIfExists('financial_requests');
        Schema::dropIfExists('payment_method_fields');
        Schema::dropIfExists('payment_methods');
    }
};
