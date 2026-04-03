<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'highest_bid')) {
                $table->decimal('highest_bid', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('products', 'lowest_bid')) {
                $table->decimal('lowest_bid', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('products', 'bids_count')) {
                $table->unsignedInteger('bids_count')->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('products', 'highest_bid')) $cols[] = 'highest_bid';
            if (Schema::hasColumn('products', 'lowest_bid')) $cols[] = 'lowest_bid';
            if (Schema::hasColumn('products', 'bids_count')) $cols[] = 'bids_count';
            if (! empty($cols)) $table->dropColumn($cols);
        });
    }
};
