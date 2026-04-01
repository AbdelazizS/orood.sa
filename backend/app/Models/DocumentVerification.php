<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVerification extends Model
{
    protected $table = 'document_verifications';

    protected $fillable = [
        'user_id',
        'type',
        'status',
        'document_url',
        'verified_at',
        'rejected_reason',
        'company_name',
        'company_city',
        'company_product_type',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public const TYPE_ID_CARD = 'id_card';
    public const TYPE_ABSHER = 'absher';
    public const TYPE_COMPANY_LICENSE = 'company_license';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
