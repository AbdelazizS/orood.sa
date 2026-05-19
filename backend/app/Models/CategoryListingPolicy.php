<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryListingPolicy extends Model
{
    protected $fillable = [
        'schema_id',
        'location_policy',
        'price_policy',
        'media_policy',
        'communication_policy',
    ];

    protected $casts = [
        'location_policy' => 'array',
        'price_policy' => 'array',
        'media_policy' => 'array',
        'communication_policy' => 'array',
    ];

    public function schema(): BelongsTo
    {
        return $this->belongsTo(CategoryListingSchema::class, 'schema_id');
    }
}
