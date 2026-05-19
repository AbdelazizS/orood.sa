<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_inquiries', function (Blueprint $table) {
            $table->string('inquiry_type', 64)->nullable()->after('phone');
            $table->string('subject')->nullable()->after('inquiry_type');
        });
    }

    public function down(): void
    {
        Schema::table('contact_inquiries', function (Blueprint $table) {
            $table->dropColumn(['inquiry_type', 'subject']);
        });
    }
};
