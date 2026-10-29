<?php

return [
    /*
    | Category slugs treated as real estate for API flags and downstream UX.
    | Default matches PhaseOneSeeder: Str::slug('Real Estate') => real-estate
    */
    'real_estate_category_slugs' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('REAL_ESTATE_CATEGORY_SLUGS', 'real-estate'))
    ))),

    /*
    | Global toggle for schema-driven listing forms on /add.
    | Per-category override: categories.dynamic_schema_enabled
    */
    'dynamic_schema_enabled' => (bool) env('LISTINGS_DYNAMIC_SCHEMA_ENABLED', false),

    /*
    | REGA: real-estate offers must carry an advertising licence number (رقم ترخيص الإعلان).
    | Off by default so existing flows keep working; turn on before the commercial launch.
    */
    'require_ad_license' => (bool) env('LISTINGS_REQUIRE_AD_LICENSE', false),

    /** Real-estate offers need a total price and a price per metre (no "على السوم"). */
    'require_real_estate_price' => (bool) env('LISTINGS_REQUIRE_RE_PRICE', true),

    /** Hide listings older than this many days as «منتهي» (owner can renew). Empty = off. */
    'expire_after_days' => env('LISTINGS_EXPIRE_DAYS') !== null && env('LISTINGS_EXPIRE_DAYS') !== '' ? (int) env('LISTINGS_EXPIRE_DAYS') : null,

    /** Delete the uploaded videos of listings still expired after this many days (saves storage). */
    'expired_video_cleanup_days' => (int) env('LISTINGS_EXPIRED_VIDEO_DAYS', 30),
];
