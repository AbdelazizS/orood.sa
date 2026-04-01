<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Notification;
use App\Models\Purchase;
use App\Models\Review;
use App\Models\User;
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
            ->orderByDesc('created_at')
            ->paginate(20);

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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_id' => ['required', 'integer', 'exists:users,id'],
            'reviewee_id' => ['sometimes', 'integer', 'exists:users,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'order_id' => ['nullable', 'integer', 'exists:purchases,id'],
            'purchase_id' => ['nullable', 'integer', 'exists:purchases,id'],
        ], [
            'target_id.required' => 'المستخدم المراد تقييمه مطلوب',
            'rating.required' => 'التقييم مطلوب',
            'rating.min' => 'التقييم يجب أن يكون بين 1 و 5',
            'rating.max' => 'التقييم يجب أن يكون بين 1 و 5',
        ]);

        $targetId = $validated['target_id'] ?? $validated['reviewee_id'] ?? null;
        if (!$targetId) {
            return response()->json(['error' => true, 'message' => 'المستخدم المراد تقييمه مطلوب'], 422);
        }

        $reviewer = $request->user();
        if ($reviewer->id === (int) $targetId) {
            return response()->json(['error' => true, 'message' => 'لا يمكنك تقييم نفسك'], 422);
        }

        $target = User::where('id', $targetId)->whereNull('banned_at')->firstOrFail();

        $purchaseId = $validated['order_id'] ?? $validated['purchase_id'] ?? null;
        if ($purchaseId) {
            $purchase = Purchase::where('id', $purchaseId)
                ->where(function ($q) use ($reviewer) {
                    $q->where('buyer_id', $reviewer->id)->orWhere('seller_id', $reviewer->id);
                })
                ->first();
            if (!$purchase) {
                return response()->json(['error' => true, 'message' => 'الطلب غير موجود أو لا ينتمي إليك'], 422);
            }
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

        $review = Review::updateOrCreate($uniqueKeys, $data);

        $target->recalculateRating();

        Notification::create([
            'user_id' => $target->id,
            'type' => 'review_new',
            'title' => 'تقييم جديد',
            'body' => ($review->reviewer?->username ?? 'مستخدم') . ' قام بتقييمك: ' . $review->rating_label,
            'data' => [
                'review_id' => $review->id,
                'link' => '/profile/' . ($target->username ?? $target->id),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'شكراً! تم إرسال تقييمك بنجاح',
            'review' => new ReviewResource($review->load('reviewer')),
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

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث تقييمك',
            'review' => new ReviewResource($review->load('reviewer')),
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
        $reviews = $query->with('reviewer')->latest()->paginate(15);

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
            ->latest()
            ->paginate(15);

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
