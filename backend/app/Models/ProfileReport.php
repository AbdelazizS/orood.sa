<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileReport extends Model
{
    public const STATUS_NEW = 'new';

    public const STATUS_INVESTIGATING = 'investigating';

    public const STATUS_ACTION_TAKEN = 'action_taken';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'reported_user_id',
        'reporter_user_id',
        'email',
        'reason',
        'message',
        'status',
        'assigned_to',
        'resolution_note',
        'action_type',
        'action_payload',
        'reviewed_at',
    ];

    protected $casts = [
        'action_payload' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function reportedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_user_id');
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
