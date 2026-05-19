<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategorySchemaSection extends Model
{
    protected $fillable = [
        'schema_id',
        'section_key',
        'title_ar',
        'title_en',
        'sort_order',
        'visible_when',
    ];

    protected $casts = [
        'visible_when' => 'array',
        'sort_order' => 'integer',
    ];

    public function schema(): BelongsTo
    {
        return $this->belongsTo(CategoryListingSchema::class, 'schema_id');
    }

    public function fields(): HasMany
    {
        return $this->hasMany(CategorySchemaField::class, 'section_id')->orderBy('sort_order');
    }

    public function localizedTitle(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return $locale === 'en' && $this->title_en
            ? $this->title_en
            : $this->title_ar;
    }
}
