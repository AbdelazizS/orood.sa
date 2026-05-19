<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactInquiry extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'inquiry_type',
        'subject',
        'message',
        'status',
        'assigned_to',
        'admin_notes',
        'form_data',
    ];

    protected $casts = [
        'form_data' => 'array',
    ];

    public const STATUS_NEW = 'new';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_CLOSED = 'closed';

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
