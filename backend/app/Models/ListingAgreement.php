<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListingAgreement extends Model
{
    protected $fillable = [
        'schema_id',
        'category_id',
        'listing_type',
        'role',
        'country',
        'content_ar',
        'content_en',
        'required',
        'sort_order',
    ];

    protected $casts = [
        'required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function schema(): BelongsTo
    {
        return $this->belongsTo(CategoryListingSchema::class, 'schema_id');
    }

    public function localizedContent(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return $locale === 'en' && $this->content_en
            ? $this->content_en
            : $this->content_ar;
    }
}
