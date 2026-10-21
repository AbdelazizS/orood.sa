<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

/**
 * A listing whose ad a subscriber bought. Owns the private follow-up notes thread.
 */
class SubscriberListing extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_SOLD = 'sold';

    protected $fillable = [
        'product_id',
        'subscriber_id',
        'purchased_at',
        'last_note_at',
        'last_note_by',
        'status',
        'expires_at',
        'ended_at',
        'end_reason',
        'refunded',
    ];

    protected $casts = [
        'purchased_at' => 'datetime',
        'last_note_at' => 'datetime',
        'expires_at' => 'datetime',
        'ended_at' => 'datetime',
        'refunded' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subscriber_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(ListingFollowUpNote::class);
    }

    /**
     * Adds `unread_count` for this viewer: notes by others written after the viewer last opened the thread.
     */
    public static function withUnreadCountFor(Builder $query, int $viewerId): Builder
    {
        return $query->withCount(['notes as unread_count' => function ($q) use ($viewerId) {
            $q->where('author_id', '!=', $viewerId)
                ->whereRaw(
                    "listing_follow_up_notes.created_at > COALESCE((SELECT r.last_read_at FROM listing_follow_up_reads r WHERE r.subscriber_listing_id = listing_follow_up_notes.subscriber_listing_id AND r.user_id = ?), '1970-01-01 00:00:00')",
                    [$viewerId]
                );
        }]);
    }

    /** Total unread notes across a set of subscriber listings for this viewer. */
    public static function unreadTotalFor(int $viewerId, ?int $subscriberId = null): int
    {
        return (int) ListingFollowUpNote::query()
            ->when($subscriberId !== null, fn ($q) => $q->whereIn(
                'subscriber_listing_id',
                self::query()->where('subscriber_id', $subscriberId)->select('id')
            ))
            ->where('author_id', '!=', $viewerId)
            ->whereRaw(
                "listing_follow_up_notes.created_at > COALESCE((SELECT r.last_read_at FROM listing_follow_up_reads r WHERE r.subscriber_listing_id = listing_follow_up_notes.subscriber_listing_id AND r.user_id = ?), '1970-01-01 00:00:00')",
                [$viewerId]
            )
            ->count();
    }

    public function markReadBy(int $userId): void
    {
        $now = now();
        DB::table('listing_follow_up_reads')->updateOrInsert(
            ['subscriber_listing_id' => $this->id, 'user_id' => $userId],
            ['last_read_at' => $now, 'updated_at' => $now, 'created_at' => $now]
        );
    }

    /**
     * Notes are private: the owning subscriber, and platform staff with the subscribers.notes permission.
     * Never the listing owner or the public.
     */
    public function notesVisibleTo(?User $user): bool
    {
        if ($user === null) {
            return false;
        }
        if ((int) $user->id === (int) $this->subscriber_id) {
            return true;
        }
        if ($user->role === UserRole::SUPERADMIN->value) {
            return true;
        }
        if (! (UserRole::tryFrom((string) $user->role)?->isPlatformManager() ?? false)) {
            return false;
        }

        return in_array('subscribers.notes', Permission::getForUser($user), true);
    }
}
