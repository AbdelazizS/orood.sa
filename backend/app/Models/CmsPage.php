<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsPage extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'slug',
        'locale',
        'title',
        'body_html',
        'meta_title',
        'meta_description',
        'og_image',
        'canonical',
        'status',
        'version',
        'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'version' => 'integer',
    ];

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }
}
