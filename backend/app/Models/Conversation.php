<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    public const TYPE_LISTING = 'listing';

    public const TYPE_DIRECT = 'direct';

    protected $fillable = [
        'product_id',
        'buyer_id',
        'seller_id',
        'conversation_type',
        'dedupe_key',
    ];

    protected static function booted(): void
    {
        static::creating(function (Conversation $c) {
            if ($c->dedupe_key) {
                return;
            }
            if ($c->product_id) {
                $c->conversation_type = $c->conversation_type ?: self::TYPE_LISTING;
                $c->dedupe_key = self::listingDedupeKey((int) $c->product_id, (int) $c->buyer_id);

                return;
            }
            if ($c->buyer_id && $c->seller_id) {
                $c->conversation_type = $c->conversation_type ?: self::TYPE_DIRECT;
                $c->dedupe_key = self::directDedupeKey((int) $c->buyer_id, (int) $c->seller_id);
            }
        });
    }

    public static function listingDedupeKey(int $productId, int $buyerId): string
    {
        return 'listing:'.$productId.':'.$buyerId;
    }

    public static function directDedupeKey(int $userAId, int $userBId): string
    {
        return 'direct:'.min($userAId, $userBId).':'.max($userAId, $userBId);
    }

    public function isDirect(): bool
    {
        return $this->conversation_type === self::TYPE_DIRECT;
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
