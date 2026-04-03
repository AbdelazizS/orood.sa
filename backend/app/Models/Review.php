<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
            ->select(['id', 'username', 'avatar_url', 'is_verified']);
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
