<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A bought ad runs for N days, can end (expired / cancelled at the owner's request / sold).
        Schema::table('subscriber_listings', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriber_listings', 'status')) {
                $table->string('status', 16)->default('active')->index(); // active | expired | cancelled | sold
            }
            if (! Schema::hasColumn('subscriber_listings', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->index();
            }
            if (! Schema::hasColumn('subscriber_listings', 'ended_at')) {
                $table->timestamp('ended_at')->nullable();
            }
            if (! Schema::hasColumn('subscriber_listings', 'end_reason')) {
                $table->string('end_reason', 500)->nullable();
            }
            if (! Schema::hasColumn('subscriber_listings', 'refunded')) {
                $table->boolean('refunded')->default(false);
            }
        });

        // Money value of each credit movement (SAR): paid packages, used ads, refunds.
        Schema::table('subscriber_ad_credits', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriber_ad_credits', 'amount_sar')) {
                $table->decimal('amount_sar', 12, 2)->nullable();
            }
        });

        Schema::table('subscriber_credit_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriber_credit_requests', 'amount_sar')) {
                $table->decimal('amount_sar', 12, 2)->nullable();
            }
        });

        // PageVisit uses timestamps but an early migration dropped updated_at → every visit insert failed (500).
        Schema::table('page_visits', function (Blueprint $table) {
            if (! Schema::hasColumn('page_visits', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('subscriber_listings', function (Blueprint $table) {
            if (Schema::hasColumn('subscriber_listings', 'status')) {
                $table->dropIndex(['status']);
            }
            if (Schema::hasColumn('subscriber_listings', 'expires_at')) {
                $table->dropIndex(['expires_at']);
            }
        });
        Schema::table('subscriber_listings', function (Blueprint $table) {
            foreach (['status', 'expires_at', 'ended_at', 'end_reason', 'refunded'] as $col) {
                if (Schema::hasColumn('subscriber_listings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
        Schema::table('subscriber_ad_credits', function (Blueprint $table) {
            if (Schema::hasColumn('subscriber_ad_credits', 'amount_sar')) {
                $table->dropColumn('amount_sar');
            }
        });
        Schema::table('subscriber_credit_requests', function (Blueprint $table) {
            if (Schema::hasColumn('subscriber_credit_requests', 'amount_sar')) {
                $table->dropColumn('amount_sar');
            }
        });
    }
};
