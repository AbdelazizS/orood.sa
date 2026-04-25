<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    protected $fillable = [
        'reviewer_id',
        'reviewee_id',
        'product_id',
        'purchase_id',
        'rating',
        'comment',
        'is_visible',
    ];

    protected $casts = [
        'rating' => 'integer',
        'is_visible' => 'boolean',
        'hidden_at' => 'datetime',
    ];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id')
            ->select(['id', 'name', 'username', 'avatar_url', 'is_verified']);
    }

    public function reviewee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewee_id')
            ->select(['id', 'username', 'avatar_url']);
    }

    public function target(): BelongsTo
    {
        return $this->reviewee();
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class)->withDefault();
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(ReviewReaction::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(ReviewReaction::class)->where('type', ReviewReaction::TYPE_LIKE);
    }

    public function dislikes(): HasMany
    {
        return $this->hasMany(ReviewReaction::class)->where('type', ReviewReaction::TYPE_DISLIKE);
    }

    /**
     * Adds like/dislike counts for API serialization when `review_reactions` exists.
     */
    public function scopeWithReactionCounts(Builder $query): Builder
    {
        if (! \Schema::hasTable('review_reactions')) {
            return $query;
        }

        return $query->withCount(['likes', 'dislikes']);
    }

    /**
     * @param  \Illuminate\Contracts\Pagination\LengthAwarePaginator<int, Review>  $paginator
     */
    public static function loadUserReactionsOnPaginator($paginator, ?User $user): void
    {
        if (! $user || ! \Schema::hasTable('review_reactions')) {
            return;
        }

        $paginator->getCollection()->load([
            'reactions' => fn ($q) => $q->where('user_id', $user->id),
        ]);
    }

    public function getRatingLabelAttribute(): string
    {
        return match ((int) $this->rating) {
            5 => 'ممتاز',
            4 => 'جيد جداً',
            3 => 'جيد',
            2 => 'مقبول',
            1 => 'سيء',
            default => '',
        };
    }
}
