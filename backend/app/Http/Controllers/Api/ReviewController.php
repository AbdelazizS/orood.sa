<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Review;
use App\Models\ReviewReaction;
use App\Models\User;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request, User $user): JsonResponse
    {
        $reviews = Review::where('reviewee_id', $user->id)
            ->where(function ($q) {
                if (\Schema::hasColumn('reviews', 'is_visible')) {
                    $q->where('is_visible', true);
                }
            })
            ->with(['reviewer', 'product'])
            ->withReactionCounts()
            ->orderByDesc('created_at')
            ->paginate(20);

        Review::loadUserReactionsOnPaginator($reviews, $request->user());

        return response()->json([
            'data' => ReviewResource::collection($reviews->items()),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
                'avg_rating' => round(Review::where('reviewee_id', $user->id)->avg('rating') ?? 0, 1),
            ],
        ]);
    }

    /**
     * Public (optional auth): reviews for the seller of this listing — same seller as all their listings.
     */
    public function forListing(Request $request, Product $listing): JsonResponse
    {
        if (! $listing->isAccessibleBy($request->user())) {
            abort(404);
        }

        $sellerId = (int) $listing->user_id;
        $reviews = Review::where('reviewee_id', $sellerId)
            ->where(function ($q) {
                if (\Schema::hasColumn('reviews', 'is_visible')) {
                    $q->where('is_visible', true);
                }
            })
            ->with(['reviewer', 'product'])
            ->withReactionCounts()
            ->orderByDesc('created_at')
            ->paginate(10);

        Review::loadUserReactionsOnPaginator($reviews, $request->user());

        $seller = User::find($sellerId);

        return response()->json([
            'data' => ReviewResource::collection($reviews->items()),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
                'avg_rating' => round((float) ($seller?->rating ?? 0), 1),
                'total_ratings' => (int) ($seller?->total_ratings ?? 0),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_id' => ['nullable', 'integer', 'exists:users,id', 'required_without:reviewee_id'],
            'reviewee_id' => ['nullable', 'integer', 'exists:users,id', 'required_without:target_id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'order_id' => ['nullable', 'integer', 'exists:purchases,id'],
            'purchase_id' => ['nullable', 'integer', 'exists:purchases,id'],
        ], [
            'rating.required' => 'التقييم مطلوب',
            'rating.min' => 'التقييم يجب أن يكون بين 1 و 5',
            'rating.max' => 'التقييم يجب أن يكون بين 1 و 5',
        ]);

        $targetId = $validated['target_id'] ?? $validated['reviewee_id'] ?? null;
        if (!$targetId) {
            return response()->json(['error' => true, 'message' => 'المستخدم المراد تقييمه مطلوب'], 422);
        }

        $purchaseId = $validated['purchase_id'] ?? $validated['order_id'] ?? null;
        if (!$purchaseId) {
            return response()->json(['error' => true, 'message' => 'رقم الطلب مطلوب للتقييم'], 422);
        }

        $reviewer = $request->user();
        if ($reviewer->id === (int) $targetId) {
            return response()->json(['error' => true, 'message' => 'لا يمكنك تقييم نفسك'], 422);
        }

        $target = User::where('id', $targetId)->whereNull('banned_at')->firstOrFail();

        $purchase = Purchase::where('id', $purchaseId)
            ->where(function ($q) use ($reviewer) {
                $q->where('buyer_id', $reviewer->id)->orWhere('seller_id', $reviewer->id);
            })
            ->first();
        if (!$purchase) {
            return response()->json(['error' => true, 'message' => 'الطلب غير موجود أو لا ينتمي إليك'], 422);
        }

        if (! in_array($purchase->status, [Purchase::STATUS_DELIVERED, Purchase::STATUS_COMPLETED], true)) {
            return response()->json(['error' => true, 'message' => 'لا يمكن التقييم إلا بعد تسليم الطلب أو إتمامه'], 422);
        }

        $counterpartyId = $reviewer->id === (int) $purchase->buyer_id
            ? (int) $purchase->seller_id
            : (int) $purchase->buyer_id;
        if ((int) $targetId !== $counterpartyId) {
            return response()->json(['error' => true, 'message' => 'المستخدم المراد تقييمه يجب أن يكون الطرف الآخر في هذا الطلب'], 422);
        }

        $uniqueKeys = [
            'reviewer_id' => $reviewer->id,
            'reviewee_id' => $target->id,
        ];
        if (\Schema::hasColumn('reviews', 'purchase_id')) {
            $uniqueKeys['purchase_id'] = $purchaseId;
        } else {
            $uniqueKeys['product_id'] = null;
        }

        $data = [
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ];
        if (\Schema::hasColumn('reviews', 'is_visible')) {
            $data['is_visible'] = true;
        }
        if (\Schema::hasColumn('reviews', 'product_id')) {
            $data['product_id'] = $purchase->product_id;
        }

        $review = Review::updateOrCreate($uniqueKeys, $data);

        $target->recalculateRating();

        $review->load('reviewer');
        if (\Schema::hasTable('review_reactions')) {
            $review->loadCount(['likes', 'dislikes']);
        }
        if ($request->user() && \Schema::hasTable('review_reactions')) {
            $review->load(['reactions' => fn ($q) => $q->where('user_id', $request->user()->id)]);
        }

        Notification::create(
            InAppNotificationPayload::reviewNew(
                (int) $target->id,
                (int) $review->id,
                (string) ($review->reviewer?->username ?? $review->reviewer?->name ?? 'User'),
                (int) $review->rating,
                '/profile/' . ($target->username ?? $target->id)
            )
        );

        return response()->json([
            'success' => true,
            'message' => 'شكراً! تم إرسال تقييمك بنجاح',
            'review' => new ReviewResource($review),
            'new_average' => round((float) $target->fresh()->rating, 1),
        ], 201);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        if ($review->reviewer_id !== $request->user()->id) {
            abort(403, 'لا يمكنك تعديل هذا التقييم');
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $review->update([
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        $review->target->recalculateRating();

        $review->load('reviewer');
        if (\Schema::hasTable('review_reactions')) {
            $review->loadCount(['likes', 'dislikes']);
        }
        if ($request->user() && \Schema::hasTable('review_reactions')) {
            $review->load(['reactions' => fn ($q) => $q->where('user_id', $request->user()->id)]);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث تقييمك',
            'review' => new ReviewResource($review),
        ]);
    }

    public function react(Request $request, Review $review): JsonResponse
    {
        if (! \Schema::hasTable('review_reactions')) {
            abort(404);
        }

        $validated = $request->validate([
            'type' => ['nullable', 'in:like,dislike'],
        ]);

        $user = $request->user();
        if ($review->reviewer_id === $user->id) {
            return response()->json(['error' => true, 'message' => 'لا يمكنك التفاعل مع تقييمك'], 422);
        }

        if (\Schema::hasColumn('reviews', 'is_visible') && ! $review->is_visible) {
            abort(404);
        }

        ReviewReaction::query()
            ->where('review_id', $review->id)
            ->where('user_id', $user->id)
            ->delete();

        if (! empty($validated['type'])) {
            ReviewReaction::create([
                'review_id' => $review->id,
                'user_id' => $user->id,
                'type' => $validated['type'],
            ]);
        }

        $review->loadCount(['likes', 'dislikes']);
        $review->load(['reactions' => fn ($q) => $q->where('user_id', $user->id)]);

        return response()->json([
            'success' => true,
            'review' => new ReviewResource($review),
        ]);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        $isOwner = $review->reviewer_id === $request->user()->id;
        $isAdmin = in_array($request->user()->role, ['admin', 'super_admin', 'manager', 'employee', 'moderator']);

        if (!$isOwner && !$isAdmin) {
            abort(403, 'لا يمكنك حذف هذا التقييم');
        }

        $targetUser = $review->target;
        $review->delete();
        $targetUser->recalculateRating();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف التقييم',
        ]);
    }

    public function myReviews(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = $user->reviews();
        if (\Schema::hasColumn('reviews', 'is_visible')) {
            $query->where('is_visible', true);
        }
        $reviews = $query->with('reviewer')->withReactionCounts()->latest()->paginate(15);

        Review::loadUserReactionsOnPaginator($reviews, $request->user());

        return response()->json([
            'reviews' => ReviewResource::collection($reviews->items()),
            'summary' => [
                'average' => round((float) $user->rating, 1),
                'total' => $user->total_ratings,
                'distribution' => $user->getRatingDistribution(),
            ],
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    public function reviewsGiven(Request $request): JsonResponse
    {
        $reviews = $request->user()
            ->reviewsGiven()
            ->with('reviewee:id,username,avatar_url')
            ->withReactionCounts()
            ->latest()
            ->paginate(15);

        Review::loadUserReactionsOnPaginator($reviews, $request->user());

        $items = $reviews->items();
        $transformed = collect($items)->map(function ($r) use ($request) {
            $resource = new ReviewResource($r);
            $arr = $resource->toArray($request);
            $arr['target'] = $r->reviewee ? [
                'id' => $r->reviewee->id,
                'username' => $r->reviewee->username,
                'avatar_url' => $r->reviewee->avatar_url,
            ] : null;
            return $arr;
        });

        return response()->json([
            'reviews' => $transformed,
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }
}
