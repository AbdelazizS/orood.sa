<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViewRequest extends Model
{
    public const STATUS_PENDING = 'PENDING';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_DECLINED = 'DECLINED';

    public const STATUS_CANCELLED = 'CANCELLED';

    protected $fillable = [
        'product_id',
        'requester_id',
        'scheduled_date',
        'location_lat',
        'location_lng',
        'location_address',
        'location_place_id',
        'status',
        'seller_note',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'location_lat' => 'float',
        'location_lng' => 'float',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
