<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialRequestEvent extends Model
{
    protected $fillable = [
        'financial_request_id',
        'actor_id',
        'event',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function financialRequest(): BelongsTo
    {
        return $this->belongsTo(FinancialRequest::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
