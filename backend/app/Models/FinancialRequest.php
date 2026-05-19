<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class FinancialRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_NEED_INFO = 'need_info';

    public const TYPE_WALLET_CHARGE = 'wallet_charge';

    public const TYPE_WALLET_WITHDRAW = 'wallet_withdraw';

    public const TYPE_GUARANTEE_DEPOSIT = 'guarantee_deposit';

    public const TYPE_GUARANTEE_REFUND = 'guarantee_refund';

    public const TYPE_ORDER_DIRECT_TRANSFER = 'order_direct_transfer';

    protected $fillable = [
        'type',
        'user_id',
        'related_type',
        'related_id',
        'amount',
        'currency',
        'status',
        'idempotency_key',
        'payment_method_id',
        'submitted_at',
        'reviewed_at',
        'completed_at',
        'reviewed_by',
        'rejection_reason',
        'admin_internal_note',
        'legacy_charge_request_id',
        'legacy_withdrawal_request_id',
        'legacy_guarantee_request_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    public function values(): HasMany
    {
        return $this->hasMany(FinancialRequestValue::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(FinancialRequestEvent::class);
    }
}
