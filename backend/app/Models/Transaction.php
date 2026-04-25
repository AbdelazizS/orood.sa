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
    /** Admin penalty: reduces seller held guarantee; may pair with buyer compensation when purchase_id set. */
    public const TYPE_GUARANTEE_ADMIN_DEDUCTION = 'guarantee_admin_deduction';
    public const TYPE_REFUND = 'refund';
    public const TYPE_PLATFORM_FEE = 'platform_fee';

    public const STATUS_PENDING = 'pending';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'description',
        'reference',
        'purchase_id',
        'status',
        'idempotency_key',
        'metadata',
        'completed_at',
        'withdrawal_request_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'completed_at' => 'datetime',
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
