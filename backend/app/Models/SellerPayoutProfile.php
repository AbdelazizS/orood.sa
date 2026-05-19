<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SellerPayoutProfile extends Model
{
    public const MODE_PLATFORM_WALLET = 'platform_wallet';

    public const MODE_DIRECT_BANK = 'direct_bank';

    public const MODE_COD_ONLY = 'cod_only';

    public const STATUS_INCOMPLETE = 'incomplete';

    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_VERIFIED = 'verified';

    public const STATUS_REJECTED = 'rejected';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'primary_mode',
        'accept_cod',
        'status',
        'verified_at',
        'reviewed_by',
        'rejection_reason',
        'meta',
    ];

    protected $casts = [
        'accept_cod' => 'boolean',
        'verified_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function values(): HasMany
    {
        return $this->hasMany(SellerPayoutProfileValue::class, 'user_id', 'user_id');
    }

    public function isReadyForListings(): bool
    {
        return $this->status === self::STATUS_VERIFIED;
    }
}
