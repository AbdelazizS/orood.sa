<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'subcategory_other')) {
                $table->string('subcategory_other', 255)->nullable()->after('subcategory_id');
            }
        });

        Schema::table('subcategories', function (Blueprint $table) {
            if (! Schema::hasColumn('subcategories', 'listing_property_type')) {
                $table->string('listing_property_type', 32)->nullable()->after('slug');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'subcategory_other')) {
                $table->dropColumn('subcategory_other');
            }
        });

        Schema::table('subcategories', function (Blueprint $table) {
            if (Schema::hasColumn('subcategories', 'listing_property_type')) {
                $table->dropColumn('listing_property_type');
            }
        });
    }
};
