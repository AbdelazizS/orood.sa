<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListingReport extends Model
{
    public const STATUS_NEW = 'new';
    public const STATUS_INVESTIGATING = 'investigating';
    public const STATUS_ACTION_TAKEN = 'action_taken';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'product_id',
        'user_id',
        'assigned_to',
        'email',
        'reason',
        'message',
        'status',
        'resolution_note',
        'action_type',
        'action_payload',
        'reviewed_at',
    ];

    protected $casts = [
        'action_payload' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public static function allowedTransitions(): array
    {
        return [
            self::STATUS_NEW => [self::STATUS_INVESTIGATING],
            self::STATUS_INVESTIGATING => [self::STATUS_ACTION_TAKEN, self::STATUS_REJECTED],
            self::STATUS_ACTION_TAKEN => [self::STATUS_CLOSED],
            self::STATUS_REJECTED => [self::STATUS_CLOSED],
            self::STATUS_CLOSED => [],
        ];
    }

    public function canTransitionTo(string $nextStatus): bool
    {
        return in_array($nextStatus, self::allowedTransitions()[$this->status] ?? [], true);
    }

    /**
     * @return array<int, string>
     */
    public static function nextStatuses(string $status): array
    {
        return self::allowedTransitions()[$status] ?? [];
    }
}
