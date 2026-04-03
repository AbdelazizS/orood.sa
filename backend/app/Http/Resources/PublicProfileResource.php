<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $authUser = $request->user();
        $isOwner = $authUser?->id === $this->id;

        $cityName = $this->city?->name_ar ?? $this->city?->name ?? null;
        $regionName = $this->city?->region?->name_ar ?? $this->city?->region?->name ?? null;

        return [
            'id' => $this->id,
            'username' => $this->username,
            'avatar_url' => $this->avatar_url,
            'cover_url' => $this->cover_photo_url ?? $this->cover_url ?? null,
            'bio' => $this->bio,
            'city' => $cityName,
            'region' => $regionName,
            'location_lat' => $this->location_lat,
            'location_lng' => $this->location_lng,
            'is_online' => $this->is_online ?? false,
            'last_seen' => $this->last_seen?->toISOString(),
            'last_seen_human' => $this->last_seen?->diffForHumans(),
            'is_verified' => $this->is_verified ?? false,
            'verification_method' => $this->verification_method,
            'financial_guarantee' => (float) ($this->financial_guarantee ?? 0),
            'rating' => (float) ($this->rating ?? 0),
            'total_ratings' => (int) ($this->total_ratings ?? 0),
            'completed_orders' => (int) ($this->completed_orders ?? 0),
            'member_since' => $this->created_at?->format('Y'),
            'is_owner' => $isOwner,
            'role' => $this->role,
            '_count' => [
                'listings' => (int) ($this->listings_count ?? $this->products()->where('status', 'published')->count()),
                'reviews' => (int) ($this->total_ratings ?? 0),
            ],
        ];
    }
}
