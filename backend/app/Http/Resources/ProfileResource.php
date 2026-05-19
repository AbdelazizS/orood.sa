<?php

namespace App\Http\Resources;

use App\Models\Purchase;
use App\Support\UserAccountKindResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = str_starts_with((string) $request->header('Accept-Language', 'ar'), 'en') ? 'en' : 'ar';
        $isOwner = $request->user()?->id === $this->id;

        $cityName = $this->city
            ? ($locale === 'ar' ? ($this->city->name_ar ?? $this->city->name) : ($this->city->name_en ?? $this->city->name))
            : null;

        $regionName = $this->city?->region
            ? ($locale === 'ar'
                ? ($this->city->region->name_ar ?? $this->city->region->name)
                : ($this->city->region->name_en ?? $this->city->region->name))
            : null;

        return [
            'id' => $this->id,
            'username' => $this->username,
            'name' => $this->name,
            'avatar_url' => $this->avatar_url,
            'cover_url' => $this->cover_photo_url ?? null,
            'bio' => $this->bio,
            'city' => $cityName,
            'city_id' => $this->city_id,
            'region' => $regionName,
            'location_lat' => $this->location_lat !== null ? (float) $this->location_lat : null,
            'location_lng' => $this->location_lng !== null ? (float) $this->location_lng : null,
            'location_address' => $this->location_address,
            'is_online' => $this->resource->appearsOnline(),
            'last_seen' => $this->last_seen?->toISOString(),
            'last_seen_human' => $this->last_seen?->diffForHumans(),
            // True after email verify and/or admin verification approval (see AuthController, AdminVerificationController).
            'is_verified' => (bool) ($this->is_verified ?? false),
            'financial_guarantee' => (float) ($this->financial_guarantee ?? 0),
            'rating' => (float) ($this->rating ?? 0),
            'total_ratings' => (int) ($this->total_ratings ?? 0),
            'completed_orders' => (int) $this->purchasesAsSeller()
                ->whereIn('status', [Purchase::STATUS_COMPLETED, Purchase::STATUS_DELIVERED])
                ->count(),
            'member_since' => $this->created_at?->format('Y-m-d'),
            'created_at' => $this->created_at?->toISOString(),
            'is_owner' => $isOwner,
            'account_kind' => UserAccountKindResolver::resolve($this->resource),
            '_count' => [
                'listings' => (int) ($this->listings_count ?? 0),
                'reviews' => (int) ($this->total_ratings ?? 0),
            ],
        ];
    }
}
