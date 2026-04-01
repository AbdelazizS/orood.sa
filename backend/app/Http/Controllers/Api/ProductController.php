<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Create an offer or request (authenticated sellers/buyers).
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $user = $request->user();
        $role = UserRole::tryFrom($user->role);
        if ($role && $role->isPlatformManager()) {
            return response()->json(['message' => 'لا يمكن لموظفي المنصة إنشاء إعلانات'], 403);
        }

        $validated = $request->validated();

        $imageUrls = $validated['image_urls'] ?? [];
        $mainImage = $validated['image_url'] ?? ($imageUrls[0] ?? null);
        $gallery = array_filter(array_merge([$mainImage], $imageUrls));
        $gallery = array_values(array_unique($gallery));

        $product = Product::create([
            'user_id' => $user->id,
            'title' => $validated['title'],
            'slug' => \Illuminate\Support\Str::slug($validated['title']) . '-' . uniqid(),
            'description' => $validated['description'],
            'price' => $validated['price'] ?? null,
            'wholesale_price' => $validated['wholesale_price'] ?? null,
            'min_quantity' => $validated['min_quantity'] ?? null,
            'is_wholesale' => $validated['is_wholesale'] ?? false,
            'condition' => $validated['condition'] ?? 'new',
            'warranty' => ($validated['condition'] ?? 'new') === 'used' ? ($validated['warranty'] ?? null) : null,
            'is_offer' => $validated['type'] === 'offer',
            'accept_bids' => $validated['accept_bids'] ?? false,
            'bids_visible' => $validated['bids_visible'] ?? true,
            'type' => $validated['type'],
            'category_id' => $validated['category_id'] ?? null,
            'subcategory_id' => $validated['subcategory_id'] ?? null,
            'region_id' => $validated['region_id'] ?? null,
            'city_id' => $validated['city_id'] ?? null,
            'image_url' => $mainImage,
            'media' => [
                'cover' => $mainImage,
                'gallery' => $gallery,
            ],
            'contact_preferences' => [
                'phone' => $validated['contact_phone'] ?? true,
                'messages' => $validated['contact_messages'] ?? true,
                'phone_number' => $validated['contact_phone_number'] ?? null,
            ],
            'shipping_details' => [
                'free_shipping' => $validated['free_shipping'] ?? false,
                'free_return' => $validated['free_return'] ?? false,
                'return_days' => $validated['return_days'] ?? null,
                'view_at_client' => $validated['view_at_client'] ?? false,
            ],
            'status' => 'pending_review',
            'published_at' => null,
        ]);

        return response()->json([
            'message' => 'تم إضافة إعلانك وسيتم مراجعته قريباً',
            'data' => new ProductResource($product->load(['category', 'subcategory', 'region', 'city', 'seller'])),
        ], 201);
    }

    /**
     * Update product (owner only).
     */
    public function update(StoreProductRequest $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validated();
        $imageUrls = $validated['image_urls'] ?? [];
        $mainImage = $validated['image_url'] ?? ($imageUrls[0] ?? $product->image_url);
        $gallery = array_filter(array_merge([$mainImage], $imageUrls));
        $gallery = array_values(array_unique($gallery));

        $product->update([
            'title' => $validated['title'] ?? $product->title,
            'description' => $validated['description'] ?? $product->description,
            'price' => $validated['price'] ?? $product->price,
            'wholesale_price' => $validated['wholesale_price'] ?? $product->wholesale_price,
            'min_quantity' => $validated['min_quantity'] ?? $product->min_quantity,
            'is_wholesale' => $validated['is_wholesale'] ?? $product->is_wholesale,
            'condition' => $validated['condition'] ?? $product->condition,
            'warranty' => ($validated['condition'] ?? $product->condition) === 'used' ? ($validated['warranty'] ?? $product->warranty) : null,
            'accept_bids' => $validated['accept_bids'] ?? $product->accept_bids,
            'bids_visible' => $validated['bids_visible'] ?? $product->bids_visible,
            'category_id' => $validated['category_id'] ?? $product->category_id,
            'subcategory_id' => $validated['subcategory_id'] ?? $product->subcategory_id,
            'region_id' => $validated['region_id'] ?? $product->region_id,
            'city_id' => $validated['city_id'] ?? $product->city_id,
            'image_url' => $mainImage,
            'media' => ['cover' => $mainImage, 'gallery' => $gallery],
            'contact_preferences' => [
                'phone' => $validated['contact_phone'] ?? ($product->contact_preferences['phone'] ?? true),
                'messages' => $validated['contact_messages'] ?? ($product->contact_preferences['messages'] ?? true),
                'phone_number' => $validated['contact_phone_number'] ?? ($product->contact_preferences['phone_number'] ?? null),
            ],
            'shipping_details' => [
                'free_shipping' => $validated['free_shipping'] ?? ($product->shipping_details['free_shipping'] ?? false),
                'free_return' => $validated['free_return'] ?? ($product->shipping_details['free_return'] ?? false),
                'return_days' => $validated['return_days'] ?? ($product->shipping_details['return_days'] ?? null),
                'view_at_client' => $validated['view_at_client'] ?? ($product->shipping_details['view_at_client'] ?? false),
            ],
        ]);

        return response()->json([
            'data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller'])),
        ]);
    }

    /**
     * List current user's products (seller dashboard).
     */
    public function index(\Illuminate\Http\Request $request): JsonResponse
    {
        $user = $request->user();
        $products = Product::where('user_id', $user->id)
            ->withCount('bids')
            ->with(['category', 'subcategory', 'region', 'city'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => ProductResource::collection($products),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Bump product to top (owner only) — updates published_at.
     */
    public function bump(\Illuminate\Http\Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $product->update(['published_at' => now(), 'bumped_at' => now()]);

        return response()->json([
            'message' => 'Product bumped to top',
            'data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller'])),
        ]);
    }

    /**
     * Publish product (owner only). Status must be pending_review.
     */
    public function publish(Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($product->status !== 'pending_review') {
            return response()->json(['message' => 'يمكن نشر الإعلانات قيد المراجعة فقط'], 422);
        }

        $product->update([
            'status' => 'published',
            'published_at' => now(),
            'bumped_at' => now(),
        ]);

        return response()->json([
            'message' => 'تم نشر الإعلان بنجاح',
            'data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller'])),
        ]);
    }

    /**
     * Delete product (owner only). Soft delete via status.
     */
    public function destroy(\Illuminate\Http\Request $request, Product $product): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $product->update(['status' => 'deleted']);

        return response()->json(['message' => 'Product deleted']);
    }
}
