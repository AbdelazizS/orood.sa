<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->text('admin_cancellation_reason')->nullable()->after('status');
            $table->foreignId('admin_cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('admin_cancelled_at')->nullable();
            $table->text('admin_refund_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['admin_cancelled_by']);
            $table->dropColumn([
                'admin_cancellation_reason',
                'admin_cancelled_by',
                'admin_cancelled_at',
                'admin_refund_reason',
            ]);
        });
    }
};
