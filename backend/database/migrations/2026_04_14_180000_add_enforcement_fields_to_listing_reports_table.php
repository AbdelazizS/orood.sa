<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('listing_reports', function (Blueprint $table) {
            $table->foreignId('assigned_to')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->text('resolution_note')->nullable()->after('message');
            $table->string('action_type')->nullable()->after('status');
            $table->json('action_payload')->nullable()->after('action_type');
            $table->timestamp('reviewed_at')->nullable()->after('action_payload');
            $table->index(['assigned_to', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('listing_reports', function (Blueprint $table) {
            $table->dropIndex(['assigned_to', 'status']);
            $table->dropConstrainedForeignId('assigned_to');
            $table->dropColumn(['resolution_note', 'action_type', 'action_payload', 'reviewed_at']);
        });
    }
};

