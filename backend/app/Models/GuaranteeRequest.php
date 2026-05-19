<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuaranteeRequest extends Model
{
    public const TYPE_DEPOSIT = 'deposit';

    public const TYPE_REFUND = 'refund';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const FUNDING_PLATFORM_WALLET = 'platform_wallet';

    public const FUNDING_EXTERNAL = 'external';

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'funding_source',
        'status',
        'admin_note',
        'approval_note',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'processed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
