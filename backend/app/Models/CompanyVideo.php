<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * A video on a real-estate company's channel (long video or Short).
 */
class CompanyVideo extends Model
{
    public const STATUS_PUBLISHED = 'published';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'company_id',
        'user_id',
        'product_id',
        'title',
        'description',
        'video_path',
        'video_url',
        'thumbnail_url',
        'duration_sec',
        'is_short',
        'views_count',
        'likes_count',
        'comments_count',
        'status',
        'hidden_reason',
        'published_at',
    ];

    protected $casts = [
        'is_short' => 'boolean',
        'duration_sec' => 'integer',
        'views_count' => 'integer',
        'likes_count' => 'integer',
        'comments_count' => 'integer',
        'published_at' => 'datetime',
        'optimized_at' => 'datetime',
        'file_size_kb' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(CompanyVideoComment::class);
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    /** Playable URL: uploaded file (relative /storage/... like other uploads) or external URL. */
    public function playbackUrl(): ?string
    {
        if ($this->video_path) {
            return '/storage/'.ltrim($this->video_path, '/');
        }

        return $this->video_url;
    }

    public function isOwnedBy(?User $user): bool
    {
        return $user !== null && (int) $user->id === (int) $this->user_id;
    }

    public function isLikedBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return DB::table('company_video_likes')
            ->where('company_video_id', $this->id)
            ->where('user_id', $user->id)
            ->exists();
    }

    public function refreshCommentsCount(): void
    {
        $this->update([
            'comments_count' => $this->comments()->where('is_hidden', false)->count(),
        ]);
    }
}
