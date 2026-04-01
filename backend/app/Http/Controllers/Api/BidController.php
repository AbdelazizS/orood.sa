<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BidResource;
use App\Events\CommentPosted;
use App\Models\Bid;
use App\Models\Comment;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BidController extends Controller
{
    public function index(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        $isOwner = $user && $product->user_id === $user->id;
        $showBidDetails = $product->bids_visible || $isOwner;

        $bids = $product->bids()
            ->with('user:id,name,username,avatar_url,is_verified')
            ->when(! $isOwner, fn ($q) => $q->where('status', Bid::STATUS_PENDING)->where('is_visible', true))
            ->orderBy($isOwner ? 'amount' : 'created_at', $isOwner ? 'asc' : 'desc')
            ->get();

        $items = $bids->map(function ($b) use ($showBidDetails, $user) {
            $resource = new BidResource($b);
            $arr = $resource->toArray(request());
            if (! $showBidDetails) {
                $arr['amount'] = null;
                $arr['amount_hidden'] = true;
                $arr['user'] = ['id' => null, 'username' => '***', 'avatar_url' => null, 'is_verified' => false];
            }
            return $arr;
        });

        return response()->json([
            'data' => $items,
            'highest_bid' => $product->highest_bid,
            'lowest_bid' => $product->lowest_bid,
            'bids_count' => (int) $product->bids_count,
        ]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        if (! $product->accept_bids) {
            return response()->json(['message' => 'Bidding is not enabled for this listing'], 422);
        }

        if ($product->user_id === $request->user()->id) {
            return response()->json(['message' => 'لا يمكنك وضع عرض على إعلانك'], 422);
        }

        if ($product->status !== 'published') {
            return response()->json(['message' => 'لا يمكن وضع عرض على إعلان غير منشور'], 422);
        }

        $maxAmount = $product->price ? (float) $product->price : PHP_FLOAT_MAX;
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0', 'max:' . $maxAmount],
            'message' => ['nullable', 'string', 'max:500'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $amount = (float) $validated['amount'];
        $note = $validated['note'] ?? $validated['message'] ?? null;

        $bid = Bid::updateOrCreate(
            [
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
            ],
            [
                'amount' => $amount,
                'message' => $note,
                'note' => $note,
                'is_visible' => true,
                'status' => Bid::STATUS_PENDING,
                'accepted_at' => null,
                'rejected_at' => null,
                'withdrawn_at' => null,
            ]
        );

        // Also create a BID-type comment (السوم) for the listing
        Comment::create([
            'listing_id' => $product->id,
            'user_id' => $request->user()->id,
            'parent_id' => null,
            'type' => 'BID',
            'body' => 'وضع عرض',
            'bid_amount' => $amount,
            'is_visible' => true,
        ]);
        // Broadcast as a comment so frontend can treat bids uniformly
        $bidComment = Comment::latest('id')->first();
        if ($bidComment) {
            event(new CommentPosted($bidComment));
        }

        $product->refreshBidStats();

        return response()->json([
            'data' => new BidResource($bid->load('user')),
            'message' => 'تم وضع العرض بنجاح',
        ], 201);
    }

    public function reject(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! $bid->isPending()) {
            return response()->json(['message' => 'Bid already processed'], 422);
        }

        $bid->update([
            'status' => Bid::STATUS_REJECTED,
            'rejected_at' => now(),
        ]);

        $product->refreshBidStats();

        return response()->json(['message' => 'تم رفض العرض']);
    }

    public function destroy(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($bid->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! $bid->isPending()) {
            return response()->json(['message' => 'Cannot withdraw processed bid'], 422);
        }

        $bid->update([
            'status' => Bid::STATUS_WITHDRAWN,
            'withdrawn_at' => now(),
        ]);

        $product->refreshBidStats();

        return response()->json(['message' => 'تم سحب العرض']);
    }

    public function toggleVisibility(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($bid->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! $bid->isPending()) {
            return response()->json(['message' => 'Cannot change visibility of processed bid'], 422);
        }

        $bid->update(['is_visible' => ! $bid->is_visible]);

        return response()->json([
            'data' => new BidResource($bid->fresh()->load('user')),
            'message' => $bid->is_visible ? 'الآن العرض مرئي' : 'الآن العرض مخفي',
        ]);
    }
}
