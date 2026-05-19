<?php

namespace App\Http\Resources;

use App\Services\Listings\ListingActionResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MyListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $seller = $request->user();
        $media = is_array($this->media) ? $this->media : [];
        $gallery = $media['gallery'] ?? ($media['cover'] ? [$media['cover']] : []);
        $cover = $media['cover'] ?? $this->image_url ?? null;
        $images = collect($gallery)->map(fn ($url, $i) => [
            'id' => $i,
            'url' => is_string($url) ? $url : ($url['url'] ?? null),
            'public_id' => null,
            'order' => $i,
        ])->values()->all();

        return [
            'id' => $this->id,
            'type' => strtoupper($this->type ?? 'offer'),
            'title' => $this->title,
            'description' => $this->description,
            'price' => $this->price ? (float) $this->price : null,
            'currency' => 'SAR',
            'status' => $this->mapStatus($this->status),
            'moderation_status' => $this->moderation_status,
            'payout_activation_status' => $this->payout_activation_status ?? 'active',
            'seller_state' => $seller
                ? app(ListingActionResolver::class)->resolve($this->resource, $seller)
                : null,
            'main_category' => [
                'id' => $this->category?->id,
                'name' => $this->category?->name_ar ?? $this->category?->name,
                'icon' => $this->category?->icon,
            ],
            'sub_category' => [
                'id' => $this->subcategory?->id,
                'name' => $this->subcategory?->name_ar ?? $this->subcategory?->name,
            ],
            'region' => [
                'id' => $this->region?->id,
                'name' => $this->region?->name_ar ?? $this->region?->name,
            ],
            'city' => [
                'id' => $this->city?->id,
                'name' => $this->city?->name_ar ?? $this->city?->name,
            ],
            'images' => $images,
            'thumbnail' => $cover,
            'stats' => [
                'view_count' => (int) ($this->view_count ?? 0),
                'today_views' => (int) ($this->today_view_count ?? 0),
                'sold_count' => (int) ($this->sold_count ?? 0),
                'message_count' => (int) ($this->message_count ?? 0),
                'pending_bids' => (int) ($this->pending_bids_count ?? 0),
            ],
            'options' => [
                'free_shipping' => (bool) ($this->free_shipping ?? false),
                'free_return_days' => (int) ($this->free_return_days ?? 0),
                'view_at_location' => (bool) ($this->view_at_location ?? false),
                'show_comments' => (bool) ($this->show_comments ?? true),
                'bidding_enabled' => (bool) ($this->accept_bids ?? false),
                'bidding_visible' => (bool) ($this->bids_visible ?? true),
                'contact_by_call' => (bool) ($this->contact_by_call ?? false),
                'contact_by_message' => true,
                'contact_phone' => $this->contact_phone,
                'tax_included' => false,
            ],
            'location_lat' => $this->location_lat,
            'location_lng' => $this->location_lng,
            'location_address' => $this->location_address,
            'listing_attributes' => $this->when(
                $this->relationLoaded('listingAttributeValues') || $this->category_id,
                fn () => app(\App\Services\Listings\ListingAttributeSchemaService::class)->attributesMapForProduct($this->resource)
            ),
            'dynamic_schema_enabled' => (bool) ($this->category?->dynamic_schema_enabled ?? false),
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
            'bumped_at' => $this->bumped_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }

    private function mapStatus(?string $status): string
    {
        return match ($status) {
            'published' => 'ACTIVE',
            'sold' => 'SOLD',
            'hidden' => 'HIDDEN',
            'deleted' => 'DELETED',
            'pending_review' => 'PENDING_REVIEW',
            'suspended' => 'SUSPENDED',
            'archived' => 'ARCHIVED',
            'draft' => 'DRAFT',
            default => 'OTHER',
        };
    }
}
