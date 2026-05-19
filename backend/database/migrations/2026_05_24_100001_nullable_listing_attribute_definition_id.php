<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('listing_attribute_values')) {
            return;
        }

        Schema::table('listing_attribute_values', function (Blueprint $table) {
            if (Schema::hasColumn('listing_attribute_values', 'category_field_definition_id')) {
                $table->foreignId('category_field_definition_id')->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        // irreversible if null rows exist
    }
};
