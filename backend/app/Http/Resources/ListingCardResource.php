<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ListingCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $media = is_array($this->media) ? $this->media : [];
        $gallery = $media['gallery'] ?? ($media['cover'] ? [$media['cover']] : []);
        $cover = $media['cover'] ?? $this->image_url ?? null;
        $thumbnail = is_string($cover) ? $cover : ($cover['url'] ?? null);
        if (!$thumbnail && !empty($gallery)) {
            $first = $gallery[0];
            $thumbnail = is_string($first) ? $first : ($first['url'] ?? null);
        }

        $locale = $request->header('Accept-Language', 'ar');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'price' => $this->price ? (float) $this->price : null,
            'thumbnail' => $thumbnail,
            'type' => $this->is_offer ? 'offer' : 'request',
            'bumped_at' => $this->bumped_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'main_category' => [
                'id' => $this->category?->id,
                'name' => $this->category?->getLocalizedName($locale) ?? $this->category?->name_ar ?? $this->category?->name,
                'icon' => $this->category?->icon,
            ],
            'city' => [
                'id' => $this->city?->id,
                'name' => $this->city?->getLocalizedName($locale) ?? $this->city?->name_ar ?? $this->city?->name,
            ],
            'stats' => [
                'view_count' => (int) ($this->view_count ?? 0),
                'message_count' => (int) ($this->message_count ?? 0),
                'sold_count' => (int) ($this->sold_count ?? 0),
            ],
            'pending_bids_count' => (int) ($this->pending_bids_count ?? 0),
        ];
    }
}
