<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\CommentDeleted;
use App\Events\CommentPosted;
use App\Models\Comment;
use App\Models\CommentLike;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request, Product $product): JsonResponse
    {
        $viewer = $request->user();
        $isOwner = $viewer && $product->user_id === $viewer->id;
        $isAdmin = $viewer && in_array($viewer->role, ['super_admin', 'admin', 'manager', 'employee'], true);

        // Visibility rules
        $publicCanSeeComments = (bool) $product->show_comments;
        $canSeeAllBecauseOwner = $isOwner || $isAdmin;
        $canSeeBidComments = (bool) ($product->bids_visible ?? false) || $canSeeAllBecauseOwner;

        if (! $publicCanSeeComments && ! $canSeeAllBecauseOwner) {
            return response()->json([
                'comments' => [],
                'meta' => [
                    'total_visible' => 0,
                    'total_regular' => 0,
                    'total_bids' => 0,
                    'show_comments' => (bool) $product->show_comments,
                    'bidding_visible' => (bool) ($product->bids_visible ?? false),
                ],
            ]);
        }

        $base = Comment::query()
            ->where('listing_id', $product->id)
            ->whereNull('parent_id')
            ->with([
                'user:id,name,username,avatar_url,is_verified',
                'replies' => function ($q) {
                    $q->where('type', 'TEAM_REPLY')->orderBy('created_at', 'asc');
                },
                'replies.user:id,name,username,avatar_url,is_verified',
            ]);

        if (! $canSeeAllBecauseOwner) {
            $base->where('is_visible', true);
        }

        $regular = (clone $base)
            ->where('type', 'REGULAR')
            ->orderBy('created_at', 'asc')
            ->get();

        $bids = collect();
        if ($canSeeBidComments) {
            $bids = (clone $base)
                ->where('type', 'BID')
                ->orderBy('bid_amount', 'asc')
                ->orderBy('created_at', 'asc')
                ->get();
        }

        $all = $regular->concat($bids)->values();

        $userId = $viewer?->id;
        if ($userId) {
            $likes = CommentLike::where('user_id', $userId)
                ->whereIn('comment_id', $all->pluck('id'))
                ->pluck('is_like', 'comment_id');
            foreach ($all as $c) {
                $c->has_liked = $likes[$c->id] ?? null; // true/false/null
            }
        }

        // Mark hidden comments for owner/admin
        if ($canSeeAllBecauseOwner) {
            foreach ($all as $c) {
                $c->is_hidden_for_viewer = ! $c->is_visible;
            }
        }

        $totalVisible = $canSeeAllBecauseOwner
            ? Comment::where('listing_id', $product->id)->whereNull('parent_id')->where('is_visible', true)->count()
            : $all->count();

        return response()->json([
            'comments' => $all,
            'meta' => [
                'total_visible' => (int) $totalVisible,
                'total_regular' => (int) $regular->count(),
                'total_bids' => (int) $bids->count(),
                'show_comments' => (bool) $product->show_comments,
                'bidding_visible' => (bool) ($product->bids_visible ?? false),
            ],
        ]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $viewer = $request->user();
        $isOwner = $viewer && $product->user_id === $viewer->id;
        $isAdmin = $viewer && in_array($viewer->role, ['super_admin', 'admin', 'manager', 'employee'], true);

        if (! $product->show_comments && ! ($isOwner || $isAdmin)) {
            return response()->json(['message' => 'Comments are disabled for this listing'], 422);
        }

        if ($product->status !== 'published') {
            return response()->json(['message' => 'Cannot comment on this listing'], 422);
        }

        $validated = $request->validate([
            'body' => 'required|string|min:1|max:1000',
        ]);

        $comment = Comment::create([
            'listing_id' => $product->id,
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
            'type' => 'REGULAR',
            'is_visible' => true,
        ]);

        $comment->load('user');

        event(new CommentPosted($comment));

        return response()->json([
            'message' => 'Comment added',
            'comment' => $comment,
        ], 201);
    }

    public function update(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();
        if (! $user || $comment->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($comment->type !== 'REGULAR' || $comment->parent_id !== null) {
            return response()->json(['message' => 'Cannot edit this comment'], 422);
        }

        $validated = $request->validate([
            'body' => 'required|string|min:1|max:1000',
        ]);

        $comment->update(['body' => $validated['body']]);

        event(new CommentPosted($comment->fresh()));

        return response()->json(['comment' => $comment->fresh(['user', 'replies'])]);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        $user = request()->user();
        $isAdmin = $user && in_array($user->role, ['super_admin', 'admin', 'manager', 'employee'], true);
        $isOwner = $user && $comment->listing?->user_id === $user->id;
        $isAuthor = $user && $comment->user_id === $user->id;

        if ($comment->type === 'TEAM_REPLY' && ! $isAdmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (! ($isAuthor || $isOwner || $isAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $deleted = clone $comment;
        $comment->delete();

        event(new CommentDeleted($deleted));

        return response()->json(['message' => 'Comment deleted']);
    }

    public function toggleVisibility(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['super_admin', 'admin', 'manager', 'employee'], true);
        $isOwner = $user && $comment->listing?->user_id === $user->id;

        if ($comment->type === 'TEAM_REPLY') {
            return response()->json(['message' => 'Cannot hide this comment'], 422);
        }

        if (! ($isOwner || $isAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $comment->update(['is_visible' => ! $comment->is_visible]);
        return response()->json(['comment' => $comment->fresh(['user', 'replies'])]);
    }

    public function teamReply(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['super_admin', 'admin', 'manager', 'employee'], true);
        if (! $isAdmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'body' => 'required|string|min:1|max:1000',
        ]);

        $reply = Comment::create([
            'listing_id' => $comment->listing_id,
            'user_id' => null,
            'parent_id' => $comment->id,
            'type' => 'TEAM_REPLY',
            'body' => $validated['body'],
            'is_visible' => true,
        ]);

        event(new CommentPosted($reply));

        return response()->json(['comment' => $reply], 201);
    }
}
