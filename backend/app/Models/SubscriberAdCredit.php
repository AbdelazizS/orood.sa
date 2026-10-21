<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriberAdCredit extends Model
{
    public const REASON_PURCHASE = 'purchase';

    public const REASON_USE = 'use';

    public const REASON_ADJUST = 'adjust';

    public const REASON_REFUND = 'refund';

    protected $fillable = [
        'subscriber_id',
        'delta',
        'reason',
        'product_id',
        'created_by',
        'note',
        'amount_sar',
    ];

    protected $casts = [
        'delta' => 'integer',
        'amount_sar' => 'float',
    ];

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subscriber_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
