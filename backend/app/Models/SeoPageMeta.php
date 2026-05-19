<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoPageMeta extends Model
{
    protected $table = 'seo_page_meta';

    protected $fillable = [
        'page_key',
        'route_pattern',
        'page_type',
        'seo_title',
        'meta_description',
        'meta_keywords',
        'canonical_url',
        'robots',
        'og_title',
        'og_description',
        'og_image',
        'og_type',
        'twitter_card',
        'priority',
        'changefreq',
        'custom_schema',
        'is_active',
    ];

    protected $casts = [
        'priority' => 'float',
        'custom_schema' => 'array',
        'is_active' => 'boolean',
    ];
}
