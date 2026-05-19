<?php

namespace App\Http\Resources;

use App\Support\UserAccountKindResolver;
use App\Services\Listings\RealEstateAttributeAdapter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $stats = $this->stats ?? [];
        $isOwner = (bool) ($this->is_owner ?? false);
        $canViewBidDetails = (bool) ($this->can_view_bid_details ?? ($isOwner || (bool) ($this->bids_visible ?? true)));
        $viewer = $request->user();
        $anonymousHigh = null;
        $minimumNextBid = null;
        if ($this->accept_bids && ! $canViewBidDetails && ! $isOwner && $viewer) {
            $maxAll = (float) ($this->bids()
                ->where('status', \App\Models\Bid::STATUS_PENDING)
                ->max('amount') ?? 0);
            if ($maxAll > 0) {
                $anonymousHigh = $maxAll;
                $minimumNextBid = round($maxAll + 0.01, 2);
            } else {
                $minimumNextBid = 0.01;
            }
        }
        $highestBid = $canViewBidDetails ? ($this->highest_bid ?? null) : $anonymousHigh;
        $visibleBidsCount = $canViewBidDetails
            ? (int) ($this->bids_count ?? $this->bids()->where('status', \App\Models\Bid::STATUS_PENDING)->count())
            : 0;
        $currentBidUserId = $canViewBidDetails ? $this->current_bid_user_id : null;
        $messageCount = (int) ($this->message_count ?? 0);
        $isDetailRequest = $request->is('api/v1/listings/*')
            || $request->is('api/v1/products/*')
            || $request->is('api/v1/wholesale/products/*');
        if ($messageCount <= 0 && $isDetailRequest && $this->id) {
            $messageCount = (int) DB::table('conversations')
                ->where('product_id', $this->id)
                ->distinct('buyer_id')
                ->count('buyer_id');
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'price' => $this->price,
            'currency' => 'SAR',
            'condition' => $this->condition,
            'warranty' => $this->warranty,
            'is_offer' => $this->is_offer,
            'accept_bids' => (bool) $this->accept_bids,
            'bids_visible' => (bool) ($this->bids_visible ?? true),
            'contact_phone' => $this->contact_phone ?? data_get($this->contact_preferences, 'phone_number'),
            'contact_by_call' => (bool) ($this->contact_by_call ?? data_get($this->contact_preferences, 'phone', false)),
            'free_shipping' => (bool) ($this->free_shipping ?? false),
            'free_return' => (bool) ($this->free_return ?? false),
            'free_return_days' => (int) ($this->free_return_days ?? 1),
            'allow_cod' => (bool) ($this->allow_cod ?? true),
            'view_at_location' => (bool) ($this->view_at_location ?? false),
            'show_comments' => (bool) ($this->show_comments ?? true),
            'view_count' => (int) ($this->view_count ?? 0),
            'today_view_count' => (int) ($this->today_view_count ?? 0),
            'message_count' => $messageCount,
            'sold_count' => (int) ($this->sold_count ?? 0),
            'shipping_days' => $this->shipping_days,
            'return_days' => $this->return_days,
            'location_city' => $this->location_city,
            'location_lat' => $this->location_lat,
            'location_lng' => $this->location_lng,
            'location_address' => $this->location_address,
            'bumped_at' => $this->bumped_at,
            'is_owner' => $isOwner,
            'location' => $this->city?->getLocalizedName($request->header('Accept-Language')) ?? $this->region?->getLocalizedName($request->header('Accept-Language')),
            'stats' => [
                'views' => (int) ($this->view_count ?? data_get($stats, 'views', 0)),
                'purchases' => data_get($stats, 'purchases', 0),
                'messages' => $messageCount > 0 ? $messageCount : (int) data_get($stats, 'messages', 0),
                'bids' => $visibleBidsCount,
                'comments' => $this->comments_count ?? $this->comments()->count(),
            ],
            'highest_bid' => $highestBid,
            'minimum_next_bid' => $minimumNextBid,
            'current_bid_user_id' => $currentBidUserId,
            'seller' => [
                'id' => $this->seller?->id,
                'username' => $this->seller?->username,
                'name' => $this->seller?->name,
                'avatar_url' => $this->seller?->avatar_url,
                'is_verified' => (bool) ($this->seller?->is_verified ?? false),
                'email_verified' => (bool) $this->seller?->email_verified_at,
                'verification_level' => $this->seller?->verification_level ?? null,
                'phone' => $this->seller?->phone ?? data_get($this->contact_preferences, 'phone_number'),
                'city' => $this->seller?->city ? [
                    'id' => $this->seller->city->id,
                    'name' => $this->seller->city->getLocalizedName($request->header('Accept-Language')),
                ] : null,
                'last_seen' => $this->seller?->last_seen,
                'is_online' => $this->sellerPresenceOnline(),
                'completed_orders' => (int) ($this->seller?->completed_orders ?? data_get($stats, 'orders', 0)),
                'rating' => (float) ($this->seller?->rating ?? 0),
                'total_ratings' => (int) ($this->seller?->total_ratings ?? 0),
                'account_kind' => $this->seller
                    ? UserAccountKindResolver::resolve($this->seller, forceListingSeller: true)
                    : null,
            ],
            'category' => $this->category ? [
                'id' => $this->category->id,
                'slug' => $this->category->slug,
                'name' => $this->category->getLocalizedName($request->header('Accept-Language')),
            ] : null,
            'is_real_estate' => $this->isRealEstateListing(),
            'real_estate' => $this->when($this->relationLoaded('realEstateDetail') && $this->realEstateDetail, function () {
                $d = $this->realEstateDetail;

                return [
                    'purpose' => $d->purpose,
                    'property_type' => $d->property_type,
                    'area_sqm' => $d->area_sqm,
                    'bedrooms' => $d->bedrooms,
                    'bathrooms' => $d->bathrooms,
                    'land_width_m' => $d->land_width_m,
                    'land_length_m' => $d->land_length_m,
                    'street_width_m' => $d->street_width_m,
                    'property_age_years' => $d->property_age_years,
                    'furnished' => (bool) $d->furnished,
                    'floor_number' => $d->floor_number,
                    'total_floors' => $d->total_floors,
                    'amenities' => $d->amenities ?? [],
                ];
            }),
            'subcategory' => $this->subcategory ? ['id' => $this->subcategory->id, 'name' => $this->subcategory->getLocalizedName($request->header('Accept-Language'))] : null,
            'region' => $this->region ? [
                'id' => $this->region->id,
                'name' => $this->region->getLocalizedName($request->header('Accept-Language')),
                'cities' => $this->region->cities?->map(fn ($c) => ['id' => $c->id, 'name' => $c->getLocalizedName($request->header('Accept-Language'))])->toArray() ?? [],
            ] : null,
            'city' => $this->city ? ['id' => $this->city->id, 'name' => $this->city->getLocalizedName($request->header('Accept-Language'))] : null,
            'shipping_details' => $this->shipping_details ?? [],
            'contact_preferences' => array_merge([
                'phone' => true,
                'messages' => true,
                'phone_number' => null,
            ], $this->contact_preferences ?? []),
            'media' => [
                'image_url' => data_get($this->media, 'cover') ?? $this->image_url,
                'gallery' => data_get($this->media, 'gallery') ?? (data_get($this->media, 'cover') ? [data_get($this->media, 'cover')] : []),
            ],
            'tags' => $this->tags ?? [],
            'published_at' => $this->published_at,
            'created_at' => $this->created_at,
            'status' => $this->status,
            'is_publicly_listed' => $this->isPubliclyListed(),
            'moderation_status' => $this->moderation_status,
            'wholesale_price' => $this->wholesale_price,
            'discount_percent' => (int) ($this->discount_percent ?? 0),
            'min_quantity' => $this->min_quantity,
            'wholesale_expires_at' => $this->wholesale_expires_at,
            'is_wholesale' => (bool) ($this->is_wholesale ?? false),
            'payout_activation_status' => $this->payout_activation_status ?? 'active',
            'seller_state' => $isOwner && $viewer
                ? app(\App\Services\Listings\ListingActionResolver::class)->resolve($this->resource, $viewer)
                : null,
            'listing_attributes' => $isDetailRequest
                ? $this->listingAttributesForDetail($request)
                : [],
            'listing_attribute_sections' => $isDetailRequest
                ? $this->listingAttributeSections($request)
                : [],
            'seller_financial_badges' => $isDetailRequest ? $this->sellerFinancialBadges() : [],
            ...$this->wholesaleReservationProgressFields(),
        ];
    }

    /**
     * @return array<string, int>
     */
    protected function wholesaleReservationProgressFields(): array
    {
        if (! array_key_exists('wholesale_reserved_count', $this->resource->getAttributes())) {
            return [];
        }

        $reserved = (int) ($this->wholesale_reserved_count ?? 0);
        $min = max(0, (int) ($this->min_quantity ?? 0));
        $target = $min > 0 ? $min : 1;
        $remaining = max(0, $min - $reserved);
        $progress = $min > 0 ? (int) min(100, round(($reserved / $min) * 100)) : 0;

        return [
            'reserved_seats' => $reserved,
            'current_buyers' => $reserved,
            'remaining_seats' => $remaining,
            'progress_percentage' => $progress,
        ];
    }

    /**
     * True only when last_seen is fresh (heartbeat). DB is_online alone is ignored so a closed
     * browser cannot leave users stuck "online" forever.
     */
    /**
     * @return list<array{code: string, label: string}>
     */
    protected function sellerFinancialBadges(): array
    {
        $seller = $this->seller;
        if (! $seller) {
            return [];
        }

        $badges = [];
        $profile = $seller->sellerPayoutProfile;
        if ($profile?->status === \App\Models\SellerPayoutProfile::STATUS_VERIFIED) {
            $badges[] = ['code' => 'payout_verified', 'label' => __('finance.badge.payout_verified')];
        }
        if ((float) ($seller->financial_guarantee ?? 0) > 0) {
            $badges[] = ['code' => 'financial_guarantee', 'label' => __('finance.badge.guarantee')];
        }

        return $badges;
    }

    protected function sellerPresenceOnline(): bool
    {
        $seller = $this->seller;
        if (! $seller) {
            return false;
        }

        return $seller->appearsOnline();
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    protected function listingAttributesMap(): array
    {
        $schemaSvc = app(\App\Services\Listings\ListingAttributeSchemaService::class);
        $map = $schemaSvc->attributesMapForProduct($this->resource);

        $legacy = [];
        if ($this->relationLoaded('realEstateDetail') && $this->realEstateDetail) {
            $legacy = app(RealEstateAttributeAdapter::class)->fromRealEstateDetail($this->realEstateDetail);
        }

        $merged = array_merge($legacy, $map);

        if ($merged !== []) {
            return $merged;
        }

        return app(\App\Services\Finance\ListingAttributeService::class)
            ->forProduct($this->resource)
            ->mapWithKeys(fn ($row) => [$row['field_key'] => $row['value']])
            ->all();
    }

    /**
     * @return list<array{key: string, title: string, fields: list<array<string, mixed>>}>
     */
    protected function requestLocale(Request $request): string
    {
        return str_starts_with((string) $request->header('Accept-Language'), 'en') ? 'en' : 'ar';
    }

    /**
     * @return array<string, mixed>
     */
    protected function listingAttributesForDetail(Request $request): array
    {
        return $this->listingAttributesMap();
    }

    /**
     * @return list<array{key: string, title: string, fields: list<array<string, mixed>>}>
     */
    protected function listingAttributeSections(Request $request): array
    {
        $schemaSvc = app(\App\Services\Listings\ListingAttributeSchemaService::class);
        $locale = $this->requestLocale($request);

        return $schemaSvc->sectionsForProductWithFallback(
            $this->resource,
            $locale,
            $this->listingAttributesMap()
        );
    }

    /**
     * True when the listing category slug is configured as real estate.
     */
    protected function isRealEstateListing(): bool
    {
        $slugs = config('listings.real_estate_category_slugs', ['real-estate']);

        $categorySlug = $this->category?->slug;
        if ($categorySlug && in_array($categorySlug, $slugs, true)) {
            return true;
        }

        $parentSlug = $this->subcategory?->category?->slug ?? $this->subcategory?->category_slug ?? null;
        if ($parentSlug && in_array($parentSlug, $slugs, true)) {
            return true;
        }

        return false;
    }
}
