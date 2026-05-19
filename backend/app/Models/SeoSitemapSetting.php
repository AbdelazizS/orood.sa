<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoSitemapSetting extends Model
{
    protected $table = 'seo_sitemap_settings';

    protected $fillable = [
        'include_main',
        'include_categories',
        'include_subcategories',
        'include_offers',
        'include_requests',
        'include_wholesale',
        'include_companies',
        'include_cities',
        'include_profiles',
        'urls_per_file',
        'auto_generate',
        'generation_time',
        'ping_google',
        'ping_bing',
        'robots_txt',
        'last_generated_at',
        'last_url_count',
    ];

    protected $casts = [
        'include_main' => 'boolean',
        'include_categories' => 'boolean',
        'include_subcategories' => 'boolean',
        'include_offers' => 'boolean',
        'include_requests' => 'boolean',
        'include_wholesale' => 'boolean',
        'include_companies' => 'boolean',
        'include_cities' => 'boolean',
        'include_profiles' => 'boolean',
        'auto_generate' => 'boolean',
        'ping_google' => 'boolean',
        'ping_bing' => 'boolean',
        'last_generated_at' => 'datetime',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'include_main' => true,
            'include_categories' => true,
            'include_subcategories' => true,
            'include_offers' => true,
            'include_requests' => true,
            'include_wholesale' => true,
            'include_companies' => true,
            'include_cities' => false,
            'include_profiles' => false,
            'urls_per_file' => 50000,
            'auto_generate' => true,
            'generation_time' => '02:00:00',
            'ping_google' => true,
            'ping_bing' => true,
        ]);
    }
}
