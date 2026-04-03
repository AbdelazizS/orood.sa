<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BidResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->user;
        $isOwnBid = $request->user() && $request->user()->id === $this->user_id;

        return [
            'id' => $this->id,
            'listing_id' => $this->product_id,
            'product_id' => $this->product_id,
            'amount' => (float) $this->amount,
            'formatted' => number_format((float) $this->amount, 2) . ' ر.س',
            'status' => $this->status,
            'is_visible' => (bool) $this->is_visible,
            'note' => $this->note ?? $this->message,
            'user' => [
                'id' => $user?->id,
                'username' => $user?->username ?? $user?->name,
                'avatar_url' => $user?->avatar_url,
                'is_verified' => (bool) ($user?->is_verified ?? false),
            ],
            'is_own_bid' => $isOwnBid,
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'withdrawn_at' => $this->withdrawn_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
