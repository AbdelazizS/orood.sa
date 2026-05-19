<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HelpArticle extends Model
{
    protected $fillable = [
        'category_id', 'slug', 'title_ar', 'title_en',
        'summary_ar', 'summary_en', 'published', 'sort_order',
    ];

    protected $casts = ['published' => 'boolean'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(HelpCategory::class, 'category_id');
    }
}
