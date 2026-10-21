<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A subscriber asks for more ad credits; admin approves (credits are added) or rejects.
        if (! Schema::hasTable('subscriber_credit_requests')) {
            Schema::create('subscriber_credit_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscriber_id')->constrained('users')->cascadeOnDelete();
                $table->unsignedInteger('quantity');
                $table->string('note', 1000)->nullable();
                $table->string('status', 16)->default('pending'); // pending | approved | rejected
                $table->unsignedInteger('approved_quantity')->nullable();
                $table->string('admin_note', 1000)->nullable();
                $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('handled_at')->nullable();
                $table->timestamps();
                $table->index(['status', 'created_at'], 'sub_credit_req_status_idx');
                $table->index(['subscriber_id', 'status'], 'sub_credit_req_sub_status_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriber_credit_requests');
    }
};
