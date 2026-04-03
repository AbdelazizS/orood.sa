<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'rating_label' => $this->rating_label,
            'comment' => $this->comment,
            'is_visible' => $this->is_visible ?? true,
            'reviewer' => [
                'id' => $this->reviewer?->id,
                'username' => $this->reviewer?->username,
                'avatar_url' => $this->reviewer?->avatar_url,
                'is_verified' => $this->reviewer?->is_verified ?? false,
            ],
            'is_own_review' => $request->user()?->id === $this->reviewer_id,
            'created_at' => $this->created_at?->toISOString(),
            'human_time' => $this->created_at?->diffForHumans(),
        ];
    }
}
