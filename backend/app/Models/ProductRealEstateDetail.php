<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductRealEstateDetail extends Model
{
    public const PURPOSES = ['sale', 'rent'];

    public const PROPERTY_TYPES = [
        'apartment',
        'villa',
        'land',
        'building',
        'floor',
        'shop',
        'farm',
    ];

    protected $fillable = [
        'product_id',
        'purpose',
        'property_type',
        'area_sqm',
        'bedrooms',
        'bathrooms',
        'land_width_m',
        'land_length_m',
        'street_width_m',
        'property_age_years',
        'furnished',
        'floor_number',
        'total_floors',
        'amenities',
    ];

    protected $casts = [
        'area_sqm' => 'float',
        'land_width_m' => 'float',
        'land_length_m' => 'float',
        'street_width_m' => 'float',
        'furnished' => 'boolean',
        'amenities' => 'array',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
