<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends Model
{
    protected $fillable = [
        'listing_id',
        'user_id',
        'parent_id',
        'type',
        'body',
        'bid_amount',
        'is_visible',
        'likes_count',
        'dislikes_count',
    ];

    protected $casts = [
        'is_visible' => 'boolean',
        'bid_amount' => 'decimal:2',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'listing_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }

    public function commentLikes(): HasMany
    {
        return $this->hasMany(CommentLike::class);
    }

    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeRegular($query)
    {
        return $query->where('type', 'REGULAR');
    }

    public function scopeBids($query)
    {
        return $query->where('type', 'BID');
    }

    public function scopeTeamReplies($query)
    {
        return $query->where('type', 'TEAM_REPLY');
    }
}
