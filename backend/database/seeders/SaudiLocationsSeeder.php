<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * City centres + district (حي) lists from database/data/saudi_locations.php, then places every
 * listing on the map (exact location → district centre → city centre). Safe to run again.
 */
class SaudiLocationsSeeder extends Seeder
{
    public function run(): void
    {
        $data = require database_path('data/saudi_locations.php');
        $cities = DB::table('cities')->pluck('id', 'slug');
        $now = now();

        foreach ($data['cities'] as $slug => [$lat, $lng]) {
            if (isset($cities[$slug])) {
                DB::table('cities')->where('id', $cities[$slug])->update(['lat' => $lat, 'lng' => $lng]);
            }
        }

        foreach ($data['districts'] as $slug => $districts) {
            if (! isset($cities[$slug])) {
                continue;
            }
            $order = 0;
            foreach ($districts as $name => $coords) {
                DB::table('districts')->updateOrInsert(
                    ['city_id' => $cities[$slug], 'name' => $name],
                    [
                        'lat' => $coords[0] ?? null,
                        'lng' => $coords[1] ?? null,
                        'sort_order' => $order++,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            }
        }

        self::backfillMapCoordinates();
    }

    /** Fill products.map_lat/map_lng where missing. */
    public static function backfillMapCoordinates(): void
    {
        DB::table('products')
            ->whereNull('map_lat')
            ->whereNotNull('location_lat')
            ->whereNotNull('location_lng')
            ->update(['map_lat' => DB::raw('location_lat'), 'map_lng' => DB::raw('location_lng')]);

        $districts = DB::table('districts')->whereNotNull('lat')->get(['city_id', 'name', 'lat', 'lng'])
            ->keyBy(fn ($d) => $d->city_id.'|'.$d->name);
        $cities = DB::table('cities')->whereNotNull('lat')->get(['id', 'lat', 'lng'])->keyBy('id');

        DB::table('products')
            ->whereNull('map_lat')
            ->whereNotNull('city_id')
            ->select(['id', 'city_id', 'district'])
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($districts, $cities) {
                foreach ($rows as $row) {
                    $d = $row->district ? $districts->get($row->city_id.'|'.trim($row->district)) : null;
                    $c = $cities->get($row->city_id);
                    $point = $d ? [$d->lat, $d->lng] : ($c ? [$c->lat, $c->lng] : null);
                    if ($point) {
                        DB::table('products')->where('id', $row->id)->update(['map_lat' => $point[0], 'map_lng' => $point[1]]);
                    }
                }
            });
    }
}
