<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One person's feedback on a listing: matches the photos? how fast was delivery / completion? */
class ListingFeedback extends Model
{
    protected $table = 'listing_feedback';

    public const SPEEDS = ['fast', 'normal', 'slow'];

    /** Delivery speed → score used for the percentage. */
    public const SPEED_SCORE = ['fast' => 100, 'normal' => 50, 'slow' => 0];

    protected $fillable = ['product_id', 'user_id', 'purchase_id', 'matches_photos', 'delivery_speed', 'comment', 'verified_purchase', 'is_hidden'];

    protected $casts = [
        'matches_photos' => 'boolean',
        'verified_purchase' => 'boolean',
        'is_hidden' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Who may rate a listing: a buyer with a delivered/completed order for it (verified), or someone who
     * messaged the seller about it. Never the owner.
     *
     * @return array{can: bool, verified: bool, purchase_id: ?int, reason: ?string}
     */
    public static function eligibility(Product $product, ?User $user): array
    {
        if (! $user) {
            return ['can' => false, 'verified' => false, 'purchase_id' => null, 'reason' => 'login'];
        }
        if ((int) $user->id === (int) $product->user_id) {
            return ['can' => false, 'verified' => false, 'purchase_id' => null, 'reason' => 'owner'];
        }

        $purchaseId = Purchase::query()
            ->where('product_id', $product->id)
            ->where('buyer_id', $user->id)
            ->whereIn('status', [Purchase::STATUS_DELIVERED, Purchase::STATUS_COMPLETED])
            ->latest('id')
            ->value('id');
        if ($purchaseId) {
            return ['can' => true, 'verified' => true, 'purchase_id' => (int) $purchaseId, 'reason' => null];
        }

        $dealt = Conversation::query()
            ->where('product_id', $product->id)
            ->where('buyer_id', $user->id)
            ->whereHas('messages', fn ($m) => $m->where('user_id', $user->id))
            ->exists();

        return $dealt
            ? ['can' => true, 'verified' => false, 'purchase_id' => null, 'reason' => null]
            : ['can' => false, 'verified' => false, 'purchase_id' => null, 'reason' => 'no_deal'];
    }
}
