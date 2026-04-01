<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    public const TYPE_DEPOSIT = 'deposit';
    public const TYPE_WITHDRAWAL = 'withdrawal';
    public const TYPE_ORDER_PAYMENT = 'order_payment';
    public const TYPE_ORDER_RECEIPT = 'order_receipt';
    public const TYPE_GUARANTEE_DEPOSIT = 'guarantee_deposit';
    public const TYPE_GUARANTEE_WITHDRAWAL = 'guarantee_withdrawal';
    public const TYPE_REFUND = 'refund';
    public const TYPE_PLATFORM_FEE = 'platform_fee';

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'description',
        'reference',
        'purchase_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }
}
