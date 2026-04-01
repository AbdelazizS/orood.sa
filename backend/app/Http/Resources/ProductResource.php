<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $stats = $this->stats ?? [];
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
            'contact_phone' => $this->contact_phone,
            'contact_by_call' => (bool) ($this->contact_by_call ?? false),
            'free_shipping' => (bool) ($this->free_shipping ?? false),
            'free_return' => (bool) ($this->free_return ?? false),
            'free_return_days' => (int) ($this->free_return_days ?? 1),
            'view_at_location' => (bool) ($this->view_at_location ?? false),
            'show_comments' => (bool) ($this->show_comments ?? true),
            'view_count' => (int) ($this->view_count ?? 0),
            'today_view_count' => (int) ($this->today_view_count ?? 0),
            'message_count' => (int) ($this->message_count ?? 0),
            'shipping_days' => $this->shipping_days,
            'return_days' => $this->return_days,
            'location_city' => $this->location_city,
            'location_lat' => $this->location_lat,
            'location_lng' => $this->location_lng,
            'bumped_at' => $this->bumped_at,
            'is_owner' => $this->is_owner ?? false,
            'location' => $this->city?->getLocalizedName($request->header('Accept-Language')) ?? $this->region?->getLocalizedName($request->header('Accept-Language')),
            'stats' => [
                'views' => (int) ($this->view_count ?? data_get($stats, 'views', 0)),
                'purchases' => data_get($stats, 'purchases', 0),
                'messages' => (int) ($this->message_count ?? data_get($stats, 'messages', 0)),
                'bids' => $this->bids_count ?? $this->bids()->count(),
                'comments' => $this->comments_count ?? $this->comments()->count(),
            ],
            'highest_bid' => $this->highest_bid ?? null,
            'current_bid_user_id' => $this->current_bid_user_id,
            'seller' => [
                'id' => $this->seller?->id,
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
                'is_online' => (bool) ($this->seller?->is_online ?? false),
                'completed_orders' => (int) ($this->seller?->completed_orders ?? data_get($stats, 'orders', 0)),
                'rating' => (float) ($this->seller?->rating ?? 0),
            ],
            'category' => $this->category ? ['id' => $this->category->id, 'name' => $this->category->getLocalizedName($request->header('Accept-Language'))] : null,
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
            'moderation_status' => $this->moderation_status ?? 'approved',
            'wholesale_price' => $this->wholesale_price,
            'min_quantity' => $this->min_quantity,
            'is_wholesale' => (bool) ($this->is_wholesale ?? false),
        ];
    }
}
