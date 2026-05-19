<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guarantee_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('guarantee_requests', 'funding_source')) {
                $table->string('funding_source', 32)->nullable()->after('amount');
            }
            if (! Schema::hasColumn('guarantee_requests', 'approval_note')) {
                $table->text('approval_note')->nullable()->after('admin_note');
            }
        });
    }

    public function down(): void
    {
        Schema::table('guarantee_requests', function (Blueprint $table) {
            if (Schema::hasColumn('guarantee_requests', 'approval_note')) {
                $table->dropColumn('approval_note');
            }
            if (Schema::hasColumn('guarantee_requests', 'funding_source')) {
                $table->dropColumn('funding_source');
            }
        });
    }
};
