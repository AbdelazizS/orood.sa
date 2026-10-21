<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\CompanyVideo;
use App\Models\CompanyVideoComment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * JSON shape for company channel videos and their comments (one place, used by every endpoint).
 */
class CompanyVideoPresenter
{
    public static function isStaff(?User $user): bool
    {
        return $user !== null && (UserRole::tryFrom((string) $user->role)?->isPlatformManager() ?? false);
    }

    /** Channel owner or platform staff can moderate (pin/heart are owner-only). */
    public static function canModerate(?User $user, CompanyVideo $video): bool
    {
        return $video->isOwnedBy($user) || self::isStaff($user);
    }

    /**
     * @param  array<int, true>|null  $likedIds  video ids liked by the viewer (batch lookup for lists; null = look up this one)
     * @return array<string, mixed>
     */
    public static function video(CompanyVideo $video, ?User $viewer, ?array $likedIds = null, ?string $locale = null): array
    {
        $company = $video->company;
        $owner = $video->owner;
        $product = $video->product;

        return [
            'id' => $video->id,
            'title' => $video->title,
            'description' => $video->description,
            'url' => $video->playbackUrl(),
            'thumbnail_url' => $video->thumbnail_url,
            'duration_sec' => $video->duration_sec,
            'is_short' => (bool) $video->is_short,
            'views_count' => (int) $video->views_count,
            'likes_count' => (int) $video->likes_count,
            'comments_count' => (int) $video->comments_count,
            'status' => $video->status,
            'published_at' => $video->published_at,
            'created_at' => $video->created_at,
            'liked_by_me' => $likedIds !== null ? isset($likedIds[$video->id]) : $video->isLikedBy($viewer),
            'is_owner' => $video->isOwnedBy($viewer),
            'can_moderate' => self::canModerate($viewer, $video),
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'user_id' => $company->user_id,
                'username' => $owner?->username,
                'avatar_url' => $owner?->avatar_url,
                'is_verified' => $company->verification_status === 'approved',
                'activities' => $company->activities ?? [],
            ] : null,
            'product' => $product && ($product->isPubliclyListed() || $product->isPubliclyVisibleAwaiting()) ? [
                'id' => $product->id,
                'title' => $product->title,
                // Awaiting-marketer listings keep their price hidden here too.
                'price' => $product->hidesPriceFrom($viewer) ? null : $product->price,
                'marketing_status' => $product->marketing_status,
                'city' => $product->city?->getLocalizedName($locale),
                'district' => $product->district,
                'image_url' => data_get($product->media, 'cover') ?? $product->image_url,
            ] : null,
        ];
    }

    /**
     * @param  array<int, true>  $likedCommentIds
     * @return array<string, mixed>
     */
    public static function comment(CompanyVideoComment $c, CompanyVideo $video, ?User $viewer, array $likedCommentIds, bool $withReplies = true): array
    {
        $author = $c->author;
        $isChannelOwner = (int) $c->user_id === (int) $video->user_id;

        $data = [
            'id' => $c->id,
            'parent_id' => $c->parent_id,
            'body' => $c->body,
            'timestamp_sec' => $c->timestamp_sec,
            'is_pinned' => (bool) $c->is_pinned,
            'owner_hearted' => (bool) $c->owner_hearted,
            'is_hidden' => (bool) $c->is_hidden,
            'likes_count' => (int) $c->likes_count,
            'liked_by_me' => isset($likedCommentIds[$c->id]),
            'created_at' => $c->created_at,
            'can_delete' => $viewer !== null && ((int) $viewer->id === (int) $c->user_id || self::canModerate($viewer, $video)),
            'author' => [
                'id' => $author?->id,
                'name' => $author?->name,
                'username' => $author?->username,
                'avatar_url' => $author?->avatar_url,
                'is_channel_owner' => $isChannelOwner,
                'is_verified_company' => $isChannelOwner && $video->company?->verification_status === 'approved',
            ],
        ];

        if ($withReplies) {
            $data['replies'] = $c->relationLoaded('replies')
                ? $c->replies->map(fn (CompanyVideoComment $r) => self::comment($r, $video, $viewer, $likedCommentIds, false))->values()->all()
                : [];
        }

        return $data;
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, true>
     */
    public static function likedVideoIds(?User $viewer, array $ids): array
    {
        if (! $viewer || $ids === []) {
            return [];
        }

        return DB::table('company_video_likes')
            ->where('user_id', $viewer->id)
            ->whereIn('company_video_id', $ids)
            ->pluck('company_video_id')
            ->mapWithKeys(fn ($id) => [(int) $id => true])
            ->all();
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, true>
     */
    public static function likedCommentIds(?User $viewer, array $ids): array
    {
        if (! $viewer || $ids === []) {
            return [];
        }

        return DB::table('company_video_comment_likes')
            ->where('user_id', $viewer->id)
            ->whereIn('company_video_comment_id', $ids)
            ->pluck('company_video_comment_id')
            ->mapWithKeys(fn ($id) => [(int) $id => true])
            ->all();
    }
}
