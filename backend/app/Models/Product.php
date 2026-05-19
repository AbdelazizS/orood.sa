<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Models\Bid;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category_id',
        'subcategory_id',
        'region_id',
        'city_id',
        'title',
        'slug',
        'description',
        'price',
        'wholesale_price',
        'discount_percent',
        'wholesale_expires_at',
        'min_quantity',
        'is_wholesale',
        'condition',
        'warranty',
        'is_offer',
        'accept_bids',
        'bids_visible',
        'type',
        'contact_preferences',
        'contact_phone',
        'contact_by_call',
        'shipping_details',
        'free_shipping',
        'free_return',
        'free_return_days',
        'allow_cod',
        'view_at_location',
        'show_comments',
        'current_bid_user_id',
        'view_count',
        'today_view_count',
        'message_count',
        'sold_count',
        'daily_view_count',
        'shipping_days',
        'return_days',
        'location_city',
        'location_lat',
        'location_lng',
        'location_address',
        'stats',
        'media',
        'image_url',
        'tags',
        'status',
        'payout_activation_status',
        'moderation_status',
        'published_at',
        'bumped_at',
        'highest_bid',
        'lowest_bid',
        'bids_count',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'is_offer' => 'boolean',
        'is_wholesale' => 'boolean',
        'accept_bids' => 'boolean',
        'bids_visible' => 'boolean',
        'contact_by_call' => 'boolean',
        'free_shipping' => 'boolean',
        'free_return' => 'boolean',
        'allow_cod' => 'boolean',
        'view_at_location' => 'boolean',
        'show_comments' => 'boolean',
        'price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'discount_percent' => 'integer',
        'wholesale_expires_at' => 'datetime',
        'location_lat' => 'float',
        'location_lng' => 'float',
        'contact_preferences' => 'array',
        'shipping_details' => 'array',
        'stats' => 'array',
        'media' => 'array',
        'tags' => 'array',
        'published_at' => 'datetime',
        'bumped_at' => 'datetime',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function currentBidUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'current_bid_user_id');
    }

    public function bids()
    {
        return $this->hasMany(Bid::class);
    }

    public function viewRequests()
    {
        return $this->hasMany(ViewRequest::class, 'product_id');
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function groupBuyReservations()
    {
        return $this->hasMany(GroupBuyReservation::class);
    }

    public function activeWholesaleReservations()
    {
        return $this->hasMany(GroupBuyReservation::class)
            ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING]);
    }

    public function isWholesaleCampaignCompleted(): bool
    {
        $target = max(1, (int) ($this->min_quantity ?? 0));
        $reserved = (int) $this->activeWholesaleReservations()->sum('quantity');

        return $reserved >= $target;
    }

    public function bulkOffers()
    {
        return $this->belongsToMany(WholesaleBulkOffer::class, 'wholesale_bulk_offer_products', 'product_id', 'bulk_offer_id');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeVisible($query)
    {
        return $query->whereNotIn('status', ['deleted']);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class, 'listing_id')->whereNull('parent_id');
    }

    public function allComments()
    {
        return $this->hasMany(Comment::class, 'listing_id');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeApproved($query)
    {
        return $query->where(function ($q) {
            $q->where('moderation_status', 'approved')->orWhereNull('moderation_status');
        });
    }

    /**
     * Same visibility as the public feed (ProductFeedService: published + approved).
     */
    public function scopePubliclyListed($query)
    {
        return $query->published()->approved();
    }

    public function isPubliclyListed(): bool
    {
        if ($this->status !== 'published') {
            return false;
        }

        return $this->moderation_status === 'approved' || $this->moderation_status === null;
    }

    /**
     * Public JSON/detail access: listed like the feed, or owner, or platform staff.
     */
    public function isAccessibleBy(?User $viewer): bool
    {
        if ($this->isPubliclyListed()) {
            return true;
        }
        if ($viewer === null) {
            return false;
        }
        if ((int) $viewer->id === (int) $this->user_id) {
            return true;
        }
        $role = UserRole::tryFrom($viewer->role ?? '');

        return $role?->isPlatformManager() ?? false;
    }

    public function refreshBidStats(): void
    {
        $pending = $this->bids()->where('status', Bid::STATUS_PENDING)->get();
        $amounts = $pending->pluck('amount')->map(fn ($a) => (float) $a)->filter(fn ($a) => $a > 0);

        $this->update([
            'highest_bid' => $amounts->isEmpty() ? null : $amounts->max(),
            'lowest_bid' => $amounts->isEmpty() ? null : $amounts->min(),
            'bids_count' => $pending->count(),
        ]);
    }

    public function bidSnapshot(?User $viewer = null): array
    {
        $isOwner = $viewer !== null && (int) $viewer->id === (int) $this->user_id;
        $canViewBidDetails = $isOwner || (bool) $this->bids_visible;

        if (! $canViewBidDetails) {
            $anonymousHigh = null;
            if ($viewer !== null && ! $isOwner) {
                $maxAll = (float) ($this->bids()
                    ->where('status', Bid::STATUS_PENDING)
                    ->max('amount') ?? 0);
                $anonymousHigh = $maxAll > 0 ? $maxAll : null;
            }

            return [
                'can_view_bid_details' => false,
                'highest_bid' => $anonymousHigh,
                'lowest_bid' => null,
                'bids_count' => 0,
                'current_bid_user_id' => null,
            ];
        }

        $pendingBidsQuery = $this->bids()
            ->where('status', Bid::STATUS_PENDING)
            ->when(! $isOwner, fn ($query) => $query->where('is_visible', true));

        $amounts = (clone $pendingBidsQuery)
            ->pluck('amount')
            ->map(fn ($amount) => (float) $amount)
            ->filter(fn ($amount) => $amount > 0)
            ->values();

        $leadingBid = (clone $pendingBidsQuery)
            ->orderByDesc('amount')
            ->orderByDesc('id')
            ->first();

        return [
            'can_view_bid_details' => true,
            'highest_bid' => $amounts->isEmpty() ? null : $amounts->max(),
            'lowest_bid' => $amounts->isEmpty() ? null : $amounts->min(),
            'bids_count' => (clone $pendingBidsQuery)->count(),
            'current_bid_user_id' => $leadingBid?->user_id,
        ];
    }

    public function groupBuy()
    {
        return $this->hasOne(GroupBuy::class);
    }

    public function realEstateDetail()
    {
        return $this->hasOne(ProductRealEstateDetail::class);
    }

    public function scopeFilterByRequest($query, array $filters = [])
    {
        return $query
            ->when(data_get($filters, 'filter') === 'requests', fn ($q) => $q->where('type', 'request'))
            ->when(data_get($filters, 'filter') === 'offers', fn ($q) => $q->where('type', 'offer'))
            ->when(data_get($filters, 'filter') === 'most-sold', fn ($q) => $q->orderByDesc('stats->purchases'))
            ->when(data_get($filters, 'filter') === 'cheapest', fn ($q) => $q->orderBy('price'))
            ->when(data_get($filters, 'filter') === 'most-viewed', fn ($q) => $q->orderByDesc('stats->views'))
            ->when(data_get($filters, 'filter') === 'online', fn ($q) => $q->where('contact_preferences->online', true))
            ->when(data_get($filters, 'category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->when(data_get($filters, 'subcategory_id'), fn ($q, $id) => $q->where('subcategory_id', $id))
            ->when(data_get($filters, 'region_id'), fn ($q, $id) => $q->where('region_id', $id))
            ->when(data_get($filters, 'city_id'), fn ($q, $id) => $q->where('city_id', $id))
            ->when(data_get($filters, 'category_id') && data_get($filters, 'region_id'), function ($q) use ($filters) {
                $q->where(function ($q2) use ($filters) {
                    $q2->whereDoesntHave('category.regions')
                        ->orWhereHas('category.regions', function ($r) use ($filters) {
                            $r->where('regions.id', $filters['region_id'])
                                ->where('category_region.is_visible', true);
                        });
                });
            })
            ->when(data_get($filters, 'search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when(data_get($filters, 'price_min'), fn ($q, $v) => $q->where('price', '>=', $v))
            ->when(data_get($filters, 'price_max'), fn ($q, $v) => $q->where('price', '<=', $v))
            ->when(data_get($filters, 'purpose'), function ($q, $purpose) {
                $q->whereHas('realEstateDetail', fn ($d) => $d->where('purpose', $purpose));
            })
            ->when(data_get($filters, 'property_type'), function ($q, $type) {
                $q->whereHas('realEstateDetail', fn ($d) => $d->where('property_type', $type));
            })
            ->when(data_get($filters, 'min_area'), function ($q, $min) {
                $q->whereHas('realEstateDetail', fn ($d) => $d->where('area_sqm', '>=', $min));
            })
            ->when(data_get($filters, 'max_area'), function ($q, $max) {
                $q->whereHas('realEstateDetail', fn ($d) => $d->where('area_sqm', '<=', $max));
            })
            ->when(data_get($filters, 'bedrooms_min'), function ($q, $min) {
                $q->whereHas('realEstateDetail', fn ($d) => $d->where('bedrooms', '>=', $min));
            })
            ->when(data_get($filters, 'filter') === 'wholesale', function ($q) use ($filters) {
                $q->where('is_wholesale', true)->whereNotNull('wholesale_price');
                $q->where(function ($q2) use ($filters) {
                    $q2->whereDoesntHave('category.regions');
                    if (data_get($filters, 'region_id')) {
                        $q2->orWhereHas('category.regions', function ($r) use ($filters) {
                            $r->where('regions.id', $filters['region_id'])
                                ->where('category_region.wholesale_visible', true);
                        });
                    } else {
                        $q2->orWhereHas('category.regions', fn ($r) => $r->where('category_region.wholesale_visible', true));
                    }
                });
            });
    }
}
