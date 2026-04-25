<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MyListingResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyListingsController extends Controller
{
    /**
     * Index: GET /api/v1/dashboard/listings
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|in:ALL,ACTIVE,SOLD,HIDDEN',
            'search' => 'nullable|string|max:100',
            'sort' => 'nullable|in:newest,oldest,price_asc,price_desc,views',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:50',
        ]);

        $user = $request->user();
        $status = $request->get('status', 'ALL');
        $search = $request->get('search');
        $sort = $request->get('sort', 'newest');
        $perPage = $request->get('per_page', 12);

        $query = Product::forUser($user->id)
            ->visible()
            ->with(['category', 'subcategory', 'region', 'city'])
            ->withCount(['bids as pending_bids_count' => fn ($q) => $q->where('status', 'PENDING')]);

        if ($status !== 'ALL') {
            $query->where('status', $this->mapStatusToDb($status));
        }

        if ($search) {
            $query->where('title', 'LIKE', "%{$search}%");
        }

        match ($sort) {
            'oldest' => $query->oldest(),
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'views' => $query->orderBy('view_count', 'desc'),
            default => $query->orderByRaw('COALESCE(bumped_at, created_at) DESC'),
        };

        $listings = $query->paginate($perPage);

        $counts = [
            'all' => Product::forUser($user->id)->visible()->count(),
            'active' => Product::forUser($user->id)->where('status', 'published')->count(),
            'sold' => Product::forUser($user->id)->where('status', 'sold')->count(),
            'hidden' => Product::forUser($user->id)->where('status', 'hidden')->count(),
        ];

        return response()->json([
            'listings' => MyListingResource::collection($listings->items()),
            'counts' => $counts,
            'pagination' => [
                'current_page' => $listings->currentPage(),
                'last_page' => $listings->lastPage(),
                'per_page' => $listings->perPage(),
                'total' => $listings->total(),
                'from' => $listings->firstItem(),
                'to' => $listings->lastItem(),
            ],
        ]);
    }

    /**
     * Toggle status: PATCH /api/v1/dashboard/listings/{product}/status
     */
    public function toggleStatus(Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'غير مصرح لك بهذا الإجراء'], 403);
        }

        $request->validate(['status' => 'required|in:ACTIVE,HIDDEN']);

        if ($product->status === 'sold') {
            return response()->json([
                'error' => true,
                'message' => 'لا يمكن تغيير حالة الإعلان المباع',
            ], 422);
        }

        $dbStatus = $request->status === 'ACTIVE' ? 'published' : 'hidden';
        $product->update(['status' => $dbStatus]);

        return response()->json([
            'success' => true,
            'message' => $request->status === 'ACTIVE' ? 'تم إظهار الإعلان' : 'تم إخفاء الإعلان',
            'listing' => new MyListingResource($product->load(['category', 'subcategory', 'region', 'city'])),
        ]);
    }

    /**
     * Bump: POST /api/v1/dashboard/listings/{product}/bump
     */
    public function bump(Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        if ($product->status !== 'published') {
            return response()->json([
                'error' => true,
                'message' => 'يمكن تحديث الإعلانات النشطة فقط',
            ], 422);
        }

        $cooldown = 60;
        $lastBump = $product->bumped_at;
        if ($lastBump && $lastBump->diffInMinutes(now()) < $cooldown) {
            $remaining = $cooldown - (int) $lastBump->diffInMinutes(now());
            return response()->json([
                'error' => true,
                'message' => "يمكنك التحديث مرة أخرى بعد {$remaining} دقيقة",
            ], 429);
        }

        $product->update(['bumped_at' => now(), 'published_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الإعلان، سيظهر في أعلى القائمة',
            'bumped_at' => $product->bumped_at->toIso8601String(),
        ]);
    }

    /**
     * Delete: DELETE /api/v1/dashboard/listings/{product}
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        $activeOrders = $product->purchases()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'error' => true,
                'message' => 'لا يمكن حذف إعلان له طلبات نشطة',
            ], 422);
        }

        $product->update(['status' => 'deleted']);

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الإعلان بنجاح',
        ]);
    }

    /**
     * Mark sold: PATCH /api/v1/dashboard/listings/{product}/mark-sold
     */
    public function markSold(Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        $product->update([
            'status' => 'sold',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديد الإعلان كمباع',
        ]);
    }

    /**
     * Duplicate: POST /api/v1/dashboard/listings/{product}/duplicate
     */
    public function duplicate(Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        $newProduct = $product->replicate();
        $newProduct->status = 'hidden';
        $newProduct->title = $product->title . ' (نسخة)';
        $newProduct->slug = \Illuminate\Support\Str::slug($product->title) . '-' . uniqid();
        $newProduct->view_count = 0;
        $newProduct->today_view_count = 0;
        $newProduct->sold_count = 0;
        $newProduct->message_count = 0;
        $newProduct->bumped_at = now();
        $newProduct->published_at = null;
        $newProduct->save();

        return response()->json([
            'success' => true,
            'message' => 'تم نسخ الإعلان، يمكنك تعديله الآن',
            'listing' => new MyListingResource(
                $newProduct->load(['category', 'subcategory', 'region', 'city'])
            ),
        ]);
    }

    private function mapStatusToDb(string $status): string
    {
        return match ($status) {
            'ACTIVE' => 'published',
            'SOLD' => 'sold',
            'HIDDEN' => 'hidden',
            default => 'published',
        };
    }
}
