<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasReactions = \Schema::hasTable('review_reactions');
        $userReaction = null;
        if ($hasReactions && $this->relationLoaded('reactions') && $request->user()) {
            $userReaction = $this->reactions->firstWhere('user_id', $request->user()->id)?->type;
        }

        return [
            'id' => $this->id,
            'purchase_id' => $this->when(
                \Schema::hasColumn('reviews', 'purchase_id'),
                $this->purchase_id
            ),
            'rating' => $this->rating,
            'rating_label' => $this->rating_label,
            'comment' => $this->comment,
            'is_visible' => $this->is_visible ?? true,
            'reviewer' => [
                'id' => $this->reviewer?->id,
                'name' => $this->reviewer?->name,
                'username' => $this->reviewer?->username,
                'avatar_url' => $this->reviewer?->avatar_url,
                'is_verified' => $this->reviewer?->is_verified ?? false,
            ],
            'product' => $this->product ? [
                'id' => $this->product->id,
                'title' => $this->product->title,
            ] : null,
            'is_own_review' => $request->user()?->id === $this->reviewer_id,
            'created_at' => $this->created_at?->toISOString(),
            'human_time' => $this->created_at?->diffForHumans(),
            'like_count' => $hasReactions ? (int) ($this->likes_count ?? 0) : 0,
            'dislike_count' => $hasReactions ? (int) ($this->dislikes_count ?? 0) : 0,
            'user_reaction' => $userReaction,
        ];
    }
}
