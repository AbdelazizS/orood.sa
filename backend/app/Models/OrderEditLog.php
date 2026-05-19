<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEditLog extends Model
{
    protected $fillable = [
        'purchase_id',
        'user_id',
        'order_edit_request_id',
        'action',
        'before_json',
        'after_json',
    ];

    protected $casts = [
        'before_json' => 'array',
        'after_json' => 'array',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
