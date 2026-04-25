<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->withCount('bids')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn ($qry) => $qry->where('title', 'like', "%{$q}%")->orWhere('description', 'like', "%{$q}%"));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('region_id')) {
            $query->where('region_id', $request->region_id);
        }
        if ($request->filled('moderation_status')) {
            $query->where('moderation_status', $request->moderation_status);
        }

        $products = $query->paginate($request->get('per_page', 20));

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

    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'subcategory', 'region', 'city', 'seller', 'bids']);
        return response()->json(['data' => new ProductResource($product)]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'condition' => ['sometimes', 'in:new,used'],
            'warranty' => ['sometimes', 'nullable', 'string', 'max:100'],
            'type' => ['sometimes', 'in:offer,request'],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'subcategory_id' => ['sometimes', 'nullable', 'exists:subcategories,id'],
            'region_id' => ['sometimes', 'nullable', 'exists:regions,id'],
            'city_id' => ['sometimes', 'nullable', 'exists:cities,id'],
            'status' => ['sometimes', 'in:draft,published,archived,suspended'],
            'moderation_status' => ['sometimes', 'nullable', 'in:approved,pending,rejected'],
            'accept_bids' => ['sometimes', 'boolean'],
            'bids_visible' => ['sometimes', 'boolean'],
            'wholesale_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_quantity' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'is_wholesale' => ['sometimes', 'boolean'],
            'image_url' => ['sometimes', 'nullable', 'string'],
            'image_urls' => ['sometimes', 'array'],
            'image_urls.*' => ['string'],
        ]);

        $imageUrls = $validated['image_urls'] ?? null;
        $mainImage = $validated['image_url'] ?? null;
        if ($imageUrls !== null || $mainImage !== null) {
            $gallery = $imageUrls ?? ($product->media['gallery'] ?? []);
            $mainImage = $mainImage ?? ($gallery[0] ?? $product->image_url);
            $gallery = array_values(array_unique(array_filter(array_merge([$mainImage], $gallery ?? []))));
            $product->image_url = $mainImage;
            $product->media = array_merge($product->media ?? [], ['cover' => $mainImage, 'gallery' => $gallery]);
        }

        $oldValues = $product->getOriginal();
        $product->fill(array_filter($validated, fn ($k) => !in_array($k, ['image_urls', 'image_url']), ARRAY_FILTER_USE_KEY));
        $product->save();

        $this->audit->log('product.updated', $product, $oldValues, $validated);

        return response()->json(['data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller']))]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->audit->log('product.deleted', $product, $product->toArray());
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    public function approve(Product $product): JsonResponse
    {
        $oldValues = $product->getOriginal();
        $product->update(['moderation_status' => 'approved', 'status' => 'published']);
        $this->audit->log('product.approved', $product, $oldValues, ['moderation_status' => 'approved', 'status' => 'published']);
        return response()->json(['data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller']))]);
    }

    public function reject(Product $product): JsonResponse
    {
        $oldValues = $product->getOriginal();
        $product->update(['moderation_status' => 'rejected']);
        $this->audit->log('product.rejected', $product, $oldValues, ['moderation_status' => 'rejected']);
        return response()->json(['data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller']))]);
    }
}
