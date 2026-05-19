<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CategoryListingSchema extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'category_id',
        'subcategory_id',
        'listing_type',
        'version',
        'status',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'version' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(CategorySchemaSection::class, 'schema_id')->orderBy('sort_order');
    }

    public function fields(): HasMany
    {
        return $this->hasMany(CategorySchemaField::class, 'schema_id')->orderBy('sort_order');
    }

    public function policy(): HasOne
    {
        return $this->hasOne(CategoryListingPolicy::class, 'schema_id');
    }

    public function agreements(): HasMany
    {
        return $this->hasMany(ListingAgreement::class, 'schema_id')->orderBy('sort_order');
    }
}
