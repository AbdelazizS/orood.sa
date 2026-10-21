<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // When each viewer (subscriber or staff member) last opened a bought listing's follow-up thread.
        // Notes by others created after last_read_at are "unread" → red badge (WhatsApp style).
        if (! Schema::hasTable('listing_follow_up_reads')) {
            Schema::create('listing_follow_up_reads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscriber_listing_id')->constrained('subscriber_listings')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('last_read_at');
                $table->timestamps();
                $table->unique(['subscriber_listing_id', 'user_id'], 'follow_up_reads_listing_user_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_follow_up_reads');
    }
};
