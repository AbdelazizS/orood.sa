<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A listing bought by a subscriber, for the subscriber's "عروضي" list and the admin "عروض المشتركين" list.
 */
class SubscriberListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'purchased_at' => $this->purchased_at,
            'last_note_at' => $this->last_note_at,
            'notes_count' => (int) ($this->notes_count ?? 0),
            'unread_count' => (int) ($this->unread_count ?? 0),
            'status' => $this->status ?? 'active',
            'expires_at' => $this->expires_at,
            'days_left' => $this->status === 'active' && $this->expires_at
                ? max(0, (int) ceil(now()->diffInHours($this->expires_at, false) / 24))
                : null,
            'ended_at' => $this->ended_at,
            'end_reason' => $this->end_reason,
            'refunded' => (bool) $this->refunded,
            'subscriber' => $this->when($this->relationLoaded('subscriber') && $this->subscriber, fn () => [
                'id' => $this->subscriber->id,
                'name' => $this->subscriber->name,
                'email' => $this->subscriber->email,
            ]),
            'product' => $this->whenLoaded('product', fn () => new ProductResource($this->product)),
        ];
    }
}
