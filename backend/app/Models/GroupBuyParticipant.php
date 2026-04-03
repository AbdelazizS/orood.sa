<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupBuyParticipant extends Model
{
    protected $fillable = ['user_id', 'group_buy_id', 'quantity'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function groupBuy(): BelongsTo
    {
        return $this->belongsTo(GroupBuy::class);
    }
}
