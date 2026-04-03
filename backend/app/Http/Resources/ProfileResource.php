<?php

namespace App\Http\Resources;

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
            'avatar_url' => $this->avatar_url,
            'cover_url' => $this->cover_photo_url ?? null,
            'bio' => $this->bio,
            'city' => $cityName,
            'region' => $regionName,
            'is_verified' => (bool) ($this->is_verified ?? false),
            'financial_guarantee' => (float) ($this->financial_guarantee ?? 0),
            'rating' => (float) ($this->rating ?? 0),
            'total_ratings' => (int) ($this->total_ratings ?? 0),
            'completed_orders' => (int) ($this->completed_orders ?? 0),
            'member_since' => $this->created_at?->format('Y-m-d'),
            'is_owner' => $isOwner,
            '_count' => [
                'listings' => (int) ($this->listings_count ?? 0),
                'reviews' => (int) ($this->total_ratings ?? 0),
            ],
        ];
    }
}
