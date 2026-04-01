<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    protected $fillable = ['title', 'description', 'assignee_id', 'status', 'priority', 'due_at', 'type'];

    public const TYPE_ADMIN = 'admin';
    public const TYPE_TEAM = 'team';
    public const TYPE_INQUIRY = 'inquiry';

    protected $casts = [
        'due_at' => 'datetime',
    ];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }
}
