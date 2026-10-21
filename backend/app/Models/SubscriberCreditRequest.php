<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriberCreditRequest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'subscriber_id',
        'quantity',
        'note',
        'status',
        'approved_quantity',
        'admin_note',
        'handled_by',
        'handled_at',
        'amount_sar',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'approved_quantity' => 'integer',
        'handled_at' => 'datetime',
    ];

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subscriber_id');
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'quantity' => $this->quantity,
            'note' => $this->note,
            'status' => $this->status,
            'approved_quantity' => $this->approved_quantity,
            'amount_sar' => $this->amount_sar !== null ? (float) $this->amount_sar : null,
            'admin_note' => $this->admin_note,
            'handled_at' => $this->handled_at,
            'created_at' => $this->created_at,
            'subscriber' => $this->relationLoaded('subscriber') && $this->subscriber ? [
                'id' => $this->subscriber->id,
                'name' => $this->subscriber->name,
                'email' => $this->subscriber->email,
                'phone' => $this->subscriber->phone,
            ] : null,
        ];
    }
}
