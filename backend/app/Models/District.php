<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A district (حي) inside a city. lat/lng is the district centre when known.
 */
class District extends Model
{
    protected $fillable = ['city_id', 'name', 'name_en', 'lat', 'lng', 'sort_order'];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'sort_order' => 'integer',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}
