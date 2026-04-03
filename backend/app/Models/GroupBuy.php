<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GroupBuy extends Model
{
    protected $fillable = ['product_id', 'target_quantity', 'current_quantity', 'discount_percent', 'ends_at'];

    protected $casts = [
        'ends_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(GroupBuyParticipant::class);
    }
}
