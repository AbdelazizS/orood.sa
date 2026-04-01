<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\CommentLiked;
use App\Models\Comment;
use App\Models\CommentLike;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentLikeController extends Controller
{
    /**
     * Toggle like/dislike on a comment.
     */
    public function __invoke(Request $request, Comment $comment): JsonResponse
    {
        $validated = $request->validate([
            'is_like' => ['required', 'boolean'],
        ]);

        $userId = $request->user()->id;
        $isLike = $validated['is_like'];

        if ($comment->type !== 'REGULAR' || $comment->parent_id !== null) {
            return response()->json(['message' => 'Cannot vote on this comment'], 422);
        }

        $existing = CommentLike::where('comment_id', $comment->id)->where('user_id', $userId)->first();

        if ($existing) {
            if ($existing->is_like === $isLike) {
                $existing->delete();
                $comment->decrement($isLike ? 'likes_count' : 'dislikes_count');
            } else {
                $comment->decrement($existing->is_like ? 'likes_count' : 'dislikes_count');
                $existing->update(['is_like' => $isLike]);
                $comment->increment($isLike ? 'likes_count' : 'dislikes_count');
            }
        } else {
            CommentLike::create([
                'comment_id' => $comment->id,
                'user_id' => $userId,
                'is_like' => $isLike,
            ]);
            $comment->increment($isLike ? 'likes_count' : 'dislikes_count');
        }

        $comment->refresh();
        $hasLiked = CommentLike::where('comment_id', $comment->id)->where('user_id', $userId)->value('is_like');

        event(new CommentLiked($comment));

        return response()->json([
            'data' => [
                'likes' => $comment->likes_count,
                'dislikes' => $comment->dislikes_count,
                'has_liked' => $hasLiked,
            ],
        ]);
    }
}
