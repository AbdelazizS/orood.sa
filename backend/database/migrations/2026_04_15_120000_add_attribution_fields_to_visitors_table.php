<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->string('utm_medium', 120)->nullable()->after('source');
            $table->string('utm_campaign', 120)->nullable()->after('utm_medium');
            $table->string('referrer_host', 255)->nullable()->after('utm_campaign');
            $table->string('referrer_path', 500)->nullable()->after('referrer_host');
            $table->string('social_channel', 50)->nullable()->after('referrer_path');
        });
    }

    public function down(): void
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->dropColumn([
                'utm_medium',
                'utm_campaign',
                'referrer_host',
                'referrer_path',
                'social_channel',
            ]);
        });
    }
};
