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
];
