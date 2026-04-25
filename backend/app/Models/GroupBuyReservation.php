<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupBuyReservation extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAYMENT_PENDING = 'payment_pending';
    public const STATUS_PURCHASED = 'purchased';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'product_id',
        'user_id',
        'quantity',
        'status',
        'checkout_expires_at',
        'price_snapshot',
        'purchase_id',
        'purchased_at',
        'cancelled_at',
        'completed_notified_at',
    ];

    protected $casts = [
        'checkout_expires_at' => 'datetime',
        'price_snapshot' => 'decimal:2',
        'purchased_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_notified_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }
}
