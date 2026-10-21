<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ad-credit ledger: +N when admin adds credits, -1 when a subscriber buys an ad.
        if (! Schema::hasTable('subscriber_ad_credits')) {
            Schema::create('subscriber_ad_credits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscriber_id')->constrained('users')->cascadeOnDelete();
                $table->integer('delta');
                $table->string('reason', 24); // purchase | use | adjust
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('note', 500)->nullable();
                $table->timestamps();
                $table->index(['subscriber_id', 'reason'], 'sub_ad_credits_sub_reason_idx');
            });
        }

        // A listing whose ad was bought by a subscriber (one subscriber per listing).
        if (! Schema::hasTable('subscriber_listings')) {
            Schema::create('subscriber_listings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->unique()->constrained('products')->cascadeOnDelete();
                $table->foreignId('subscriber_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('purchased_at');
                $table->timestamp('last_note_at')->nullable();
                $table->foreignId('last_note_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['subscriber_id', 'last_note_at'], 'sub_listings_sub_last_note_idx');
            });
        }

        // Private follow-up notes: subscriber + Arooth staff/admin only (not the public comments).
        if (! Schema::hasTable('listing_follow_up_notes')) {
            Schema::create('listing_follow_up_notes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscriber_listing_id')->constrained('subscriber_listings')->cascadeOnDelete();
                $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
                $table->text('body');
                $table->timestamps();
                $table->index(['subscriber_listing_id', 'created_at'], 'follow_up_notes_listing_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_follow_up_notes');
        Schema::dropIfExists('subscriber_listings');
        Schema::dropIfExists('subscriber_ad_credits');
    }
};
