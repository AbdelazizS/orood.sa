<?php

return [
    /*
    | Optional override: manfith | legacy | osm
    | Unset = auto (Mapbox when MAPBOX_PUBLIC_ACCESS_TOKEN is set, else legacy/OSM).
    */
    'engine' => env('MAP_ENGINE'),

    /** Public Mapbox token (pk.*) — safe to expose to the browser. */
    'mapbox_public_token' => env('MAPBOX_PUBLIC_ACCESS_TOKEN', env('MAPBOX_ACCESS_TOKEN')),

    'style_id' => env('MAPBOX_STYLE_ID', env('MANFITH_MAP_STYLE_ID')),

    'default_lat' => (float) env('MAP_DEFAULT_LAT', 24.7136),
    'default_lng' => (float) env('MAP_DEFAULT_LNG', 46.6753),

    /** Nominatim proxy (server-side geocoding for OSM mode). */
    'nominatim_base_url' => rtrim(env('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org'), '/'),

    'nominatim_user_agent' => env(
        'NOMINATIM_USER_AGENT',
        'Arooth/1.0 (https://arooth.sa; contact@arooth.sa)'
    ),

    /** Cache TTL in seconds for geocode search/reverse responses. */
    'geocode_cache_ttl' => (int) env('GEOCODE_CACHE_TTL', 3600),

    /**
     * Viewbox for Saudi Arabia bias (min_lon,min_lat,max_lon,max_lat).
     * Improves Arabic place-name search results.
     */
    'nominatim_viewbox' => env('NOMINATIM_VIEWBOX', '34.5,16.0,55.7,32.2'),
];
