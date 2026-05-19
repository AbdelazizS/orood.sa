<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('purchases', 'buyer_transfer_confirmed_at')) {
                $table->timestamp('buyer_transfer_confirmed_at')->nullable()->after('seller_transfer_confirmed_at');
            }
            if (! Schema::hasColumn('purchases', 'buyer_transfer_confirmed_by')) {
                $table->foreignId('buyer_transfer_confirmed_by')->nullable()->after('buyer_transfer_confirmed_at')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            if (Schema::hasColumn('purchases', 'buyer_transfer_confirmed_by')) {
                $table->dropConstrainedForeignId('buyer_transfer_confirmed_by');
            }
            if (Schema::hasColumn('purchases', 'buyer_transfer_confirmed_at')) {
                $table->dropColumn('buyer_transfer_confirmed_at');
            }
        });
    }
};
