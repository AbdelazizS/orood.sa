<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceProvider extends Model
{
    public const STATUS_ACTIVE = 'active';

    protected $fillable = [
        'user_id',
        'service_category_id',
        'service_type',
        'title',
        'description',
        'cities',
        'pricing_type',
        'price_from',
        'price_to',
        'rating_avg',
        'rating_count',
        'is_available',
        'vehicle_type',
        'latitude',
        'longitude',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'cities' => 'array',
            'is_available' => 'boolean',
            'price_from' => 'float',
            'price_to' => 'float',
            'rating_avg' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'service_category_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ServiceReview::class);
    }
}
