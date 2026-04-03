<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PageVisit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'profile_id',
        'product_id',
        'visitor_id',
        'source',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'visitor_id')
            ->select(['id', 'username', 'avatar_url']);
    }
}
