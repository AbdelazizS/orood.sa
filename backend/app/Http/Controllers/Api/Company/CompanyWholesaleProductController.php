<?php

namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\WholesaleBulkOffer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompanyWholesaleProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $company = $request->user()?->company;
        if (! $company) {
            return response()->json(['message' => __('verification.company_profile_required')], 422);
        }

        $products = Product::query()
            ->where('user_id', $request->user()->id)
            ->where('is_wholesale', true)
            ->with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->withCount([
                'activeWholesaleReservations as wholesale_reserved_count' => fn ($q) => $q->select(DB::raw('coalesce(sum(quantity),0)')),
            ])
            ->orderByDesc('created_at')
            ->paginate(12);

        return response()->json([
            'data' => ProductResource::collection($products->getCollection()),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($gate = $this->companyGate($request)) {
            return $gate;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'original_price' => ['required', 'numeric', 'min:0.01'],
            'discount_percent' => ['required', 'integer', 'min:1', 'max:90'],
            'min_buyers' => ['required', 'integer', 'min:2', 'max:10000'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'integer', 'exists:subcategories,id'],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'image_urls' => ['required', 'array', 'min:1', 'max:10'],
            'image_urls.*' => ['string', 'max:500'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'status' => ['nullable', 'in:published,pending_review'],
        ]);

        $wholesalePrice = $this->calcWholesalePrice(
            (float) $validated['original_price'],
            (int) $validated['discount_percent']
        );

        $imageUrls = array_values(array_unique(array_filter($validated['image_urls'])));
        $product = Product::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'slug' => Str::slug($validated['title']) . '-' . uniqid(),
            'description' => $validated['description'],
            'price' => $validated['original_price'],
            'discount_percent' => (int) $validated['discount_percent'],
            'wholesale_price' => $wholesalePrice,
            'min_quantity' => (int) $validated['min_buyers'],
            'wholesale_expires_at' => $validated['expires_at'] ?? null,
            'is_wholesale' => true,
            'is_offer' => true,
            'type' => 'offer',
            'category_id' => $validated['category_id'],
            'subcategory_id' => $validated['subcategory_id'] ?? null,
            'region_id' => $validated['region_id'] ?? null,
            'city_id' => $validated['city_id'] ?? null,
            'image_url' => $imageUrls[0] ?? null,
            'media' => ['cover' => $imageUrls[0] ?? null, 'gallery' => $imageUrls],
            'accept_bids' => false,
            'bids_visible' => true,
            'show_comments' => true,
            'status' => $validated['status'] ?? 'published',
            'moderation_status' => 'approved',
            'published_at' => now(),
            'bumped_at' => now(),
        ]);

        return response()->json([
            'message' => __('wholesale.product_created'),
            'data' => new ProductResource($product->load(['category', 'subcategory', 'region', 'city', 'seller'])),
        ], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        if ($gate = $this->companyGate($request)) {
            return $gate;
        }

        if ((int) $product->user_id !== (int) $request->user()->id || ! $product->is_wholesale) {
            return response()->json(['message' => __('auth.invalid_credentials')], 403);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'original_price' => ['sometimes', 'numeric', 'min:0.01'],
            'discount_percent' => ['sometimes', 'integer', 'min:1', 'max:90'],
            'min_buyers' => ['sometimes', 'integer', 'min:2', 'max:10000'],
            'image_urls' => ['sometimes', 'array', 'min:1', 'max:10'],
            'image_urls.*' => ['string', 'max:500'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'status' => ['sometimes', 'in:published,pending_review,hidden,deleted'],
        ]);

        $price = array_key_exists('original_price', $validated) ? (float) $validated['original_price'] : (float) $product->price;
        $discount = array_key_exists('discount_percent', $validated) ? (int) $validated['discount_percent'] : (int) ($product->discount_percent ?? 0);

        $payload = [
            'title' => $validated['title'] ?? $product->title,
            'description' => $validated['description'] ?? $product->description,
            'price' => $price,
            'discount_percent' => $discount,
            'wholesale_price' => $this->calcWholesalePrice($price, $discount),
            'min_quantity' => array_key_exists('min_buyers', $validated) ? (int) $validated['min_buyers'] : $product->min_quantity,
            'wholesale_expires_at' => $validated['expires_at'] ?? $product->wholesale_expires_at,
            'status' => $validated['status'] ?? $product->status,
        ];

        if (array_key_exists('image_urls', $validated)) {
            $imageUrls = array_values(array_unique(array_filter($validated['image_urls'])));
            $payload['image_url'] = $imageUrls[0] ?? null;
            $payload['media'] = ['cover' => $imageUrls[0] ?? null, 'gallery' => $imageUrls];
        }

        $product->update($payload);

        return response()->json([
            'message' => __('wholesale.product_updated'),
            'data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller'])),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        if ($gate = $this->companyGate($request)) {
            return $gate;
        }

        if ((int) $product->user_id !== (int) $request->user()->id || ! $product->is_wholesale) {
            return response()->json(['message' => __('auth.invalid_credentials')], 403);
        }

        $hasReservations = $product->groupBuyReservations()->whereIn('status', ['pending', 'payment_pending', 'purchased'])->exists();
        if ($hasReservations) {
            return response()->json(['message' => __('wholesale.product_has_reservations')], 422);
        }

        $product->update(['status' => 'deleted']);

        return response()->json(['message' => __('wholesale.product_deleted')]);
    }

    public function storeBulkOffer(Request $request): JsonResponse
    {
        if ($gate = $this->companyGate($request)) {
            return $gate;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:3000'],
            'discount_percent' => ['required', 'integer', 'min:1', 'max:90'],
            'min_buyers' => ['required', 'integer', 'min:2', 'max:10000'],
            'valid_until' => ['nullable', 'date', 'after:today'],
            'product_ids' => ['required', 'array', 'min:2'],
            'product_ids.*' => ['integer', 'exists:products,id'],
        ]);

        $user = $request->user();
        $company = $user->company;

        $products = Product::query()
            ->whereIn('id', $validated['product_ids'])
            ->where('user_id', $user->id)
            ->where('is_wholesale', true)
            ->get();

        if ($products->count() !== count($validated['product_ids'])) {
            return response()->json(['message' => __('wholesale.invalid_bulk_products')], 422);
        }

        $bulkOffer = DB::transaction(function () use ($validated, $products, $company) {
            $bulkOffer = WholesaleBulkOffer::create([
                'company_id' => $company->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'discount_percent' => (int) $validated['discount_percent'],
                'min_buyers' => (int) $validated['min_buyers'],
                'valid_until' => $validated['valid_until'] ?? null,
                'status' => 'active',
            ]);

            $bulkOffer->products()->sync($products->pluck('id')->all());

            foreach ($products as $product) {
                $price = (float) ($product->price ?? 0);
                $product->update([
                    'discount_percent' => (int) $validated['discount_percent'],
                    'wholesale_price' => $this->calcWholesalePrice($price, (int) $validated['discount_percent']),
                    'min_quantity' => (int) $validated['min_buyers'],
                ]);
            }

            return $bulkOffer->load('products');
        });

        return response()->json([
            'message' => __('wholesale.bulk_offer_created'),
            'data' => $bulkOffer,
        ], 201);
    }

    private function companyGate(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->company) {
            return response()->json(['message' => __('verification.company_profile_required')], 422);
        }
        if (! $user->canSellWholesale()) {
            return response()->json(['message' => __('verification.wholesale_requires_approved_company')], 403);
        }

        return null;
    }

    private function calcWholesalePrice(float $originalPrice, int $discountPercent): float
    {
        $value = $originalPrice * ((100 - $discountPercent) / 100);

        return round(max($value, 0), 2);
    }
}
