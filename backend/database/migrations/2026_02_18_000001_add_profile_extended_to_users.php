<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('cover_photo_url')->nullable()->after('avatar_url');
            $table->string('logo_url')->nullable()->after('cover_photo_url');
            $table->decimal('financial_guarantee', 12, 2)->default(0)->after('logo_url');
            $table->string('verification_type')->nullable()->after('is_verified'); // 'id_card', 'absher', null
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cover_photo_url', 'logo_url', 'financial_guarantee', 'verification_type']);
        });
    }
};
