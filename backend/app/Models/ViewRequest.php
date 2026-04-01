<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViewRequest extends Model
{
    protected $fillable = [
        'product_id',
        'requester_id',
        'scheduled_date',
        'location_lat',
        'location_lng',
        'location_address',
        'status',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'location_lat' => 'float',
        'location_lng' => 'float',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }
}
