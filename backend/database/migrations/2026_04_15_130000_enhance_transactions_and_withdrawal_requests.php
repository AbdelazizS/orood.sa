<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('bank_iban', 50);
            $table->string('bank_name', 255);
            $table->string('status', 32)->default('pending'); // pending, approved, rejected
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('status', 32)->default('completed')->after('purchase_id');
            $table->string('idempotency_key', 191)->nullable()->after('status');
            $table->json('metadata')->nullable()->after('idempotency_key');
            $table->timestamp('completed_at')->nullable()->after('metadata');
            $table->foreignId('withdrawal_request_id')->nullable()->after('completed_at')
                ->constrained('withdrawal_requests')->nullOnDelete();
        });

        DB::table('transactions')->update([
            'status' => 'completed',
            'completed_at' => DB::raw('COALESCE(updated_at, created_at)'),
        ]);

        Schema::table('transactions', function (Blueprint $table) {
            $table->unique(['user_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'idempotency_key']);
            $table->dropConstrainedForeignId('withdrawal_request_id');
            $table->dropColumn(['status', 'idempotency_key', 'metadata', 'completed_at']);
        });

        Schema::dropIfExists('withdrawal_requests');
    }
};
