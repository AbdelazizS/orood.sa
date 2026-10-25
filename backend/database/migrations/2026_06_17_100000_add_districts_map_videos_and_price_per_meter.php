<?php

use Database\Seeders\SaudiLocationsSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Client notes 2026-10:
 * - District (حي) lists per city, searchable on the homepage and when publishing.
 * - City centres so listings without an exact location (cars, furniture…) still appear on the map.
 * - Real-estate price per metre, and "show my video on the map instead of the price".
 * - Any listing owner (not only companies) can attach a video to a listing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('districts')) {
            Schema::create('districts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('city_id')->constrained('cities')->cascadeOnDelete();
                $table->string('name', 120);
                $table->string('name_en', 120)->nullable();
                $table->decimal('lat', 10, 7)->nullable();
                $table->decimal('lng', 10, 7)->nullable();
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
                $table->unique(['city_id', 'name'], 'districts_city_name_unique');
            });
        }

        Schema::table('cities', function (Blueprint $table) {
            if (! Schema::hasColumn('cities', 'lat')) {
                $table->decimal('lat', 10, 7)->nullable();
                $table->decimal('lng', 10, 7)->nullable();
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'price_per_meter')) {
                $table->decimal('price_per_meter', 14, 2)->nullable();
            }
            if (! Schema::hasColumn('products', 'map_display')) {
                // price | video — what the listing shows on the price map (video only when it has one).
                $table->string('map_display', 10)->default('price');
            }
            if (! Schema::hasColumn('products', 'map_lat')) {
                // Where the listing sits on the map: exact location, else district centre, else city centre.
                $table->decimal('map_lat', 10, 7)->nullable();
                $table->decimal('map_lng', 10, 7)->nullable();
                $table->index(['map_lat', 'map_lng'], 'products_map_coords_idx');
            }
        });

        // Listing videos uploaded by individuals have no company.
        Schema::table('company_videos', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->change();
        });

        // Districts + city centres + map positions. On a fresh install the cities don't exist yet,
        // so ProductionSeeder runs the same seeder again after creating them.
        (new SaudiLocationsSeeder)->run();
        $this->backfillPricePerMeter();
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_map_coords_idx');
            $table->dropColumn(['price_per_meter', 'map_display', 'map_lat', 'map_lng']);
        });
        Schema::table('cities', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng']);
        });
        Schema::dropIfExists('districts');
    }

    /** Existing real-estate listings with a price and an area get their price per metre. */
    private function backfillPricePerMeter(): void
    {
        DB::table('products')
            ->join('product_real_estate_details as d', 'd.product_id', '=', 'products.id')
            ->whereNull('products.price_per_meter')
            ->where('products.price', '>', 0)
            ->where('d.area_sqm', '>', 0)
            ->select(['products.id', 'products.price', 'd.area_sqm'])
            ->orderBy('products.id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('products')->where('id', $row->id)
                        ->update(['price_per_meter' => round((float) $row->price / (float) $row->area_sqm)]);
                }
            });
    }
};
