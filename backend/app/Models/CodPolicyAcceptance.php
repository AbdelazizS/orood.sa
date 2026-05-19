<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodPolicyAcceptance extends Model
{
    protected $fillable = [
        'purchase_id',
        'buyer_id',
        'accepted_at',
        'policy_snapshot',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'policy_snapshot' => 'array',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }
}
