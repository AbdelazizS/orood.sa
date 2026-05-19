<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Category;
use App\Services\AdminSettingsService;
use App\Services\Listings\ListingAttributeSchemaService;
use App\Services\Listings\ListingSchemaService;
use App\Services\Listings\ListingSchemaValidator;
use App\Services\Listings\RealEstateAttributeAdapter;
use App\Services\ProductRealEstateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        private readonly AdminSettingsService $settings,
        private readonly ProductRealEstateService $realEstateService,
        private readonly ListingSchemaService $listingSchemas,
        private readonly ListingSchemaValidator $schemaValidator,
        private readonly ListingAttributeSchemaService $attributeSchema,
        private readonly RealEstateAttributeAdapter $reAdapter,
    ) {}

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
        if ($error = $this->wholesaleGuardError($user, $validated['is_wholesale'] ?? false)) {
            return $error;
        }

        $imageUrls = $validated['image_urls'] ?? [];
        $mainImage = $validated['image_url'] ?? ($imageUrls[0] ?? null);
        $gallery = array_filter(array_merge([$mainImage], $imageUrls));
        $gallery = array_values(array_unique($gallery));

        $autoPublish = $this->settings->getBool(
            AdminSettingsService::KEY_LISTINGS_AUTO_PUBLISH,
            (bool) config('listings.auto_publish_on_create', true)
        );
        $payoutActivation = app(\App\Services\Finance\PaymentEligibilityEngine::class)
            ->resolveListingActivationStatus($user, $autoPublish);
        $defaultBidsVisible = $this->settings->getBool(AdminSettingsService::KEY_DEFAULT_BIDS_VISIBLE, true);
        $defaultCommentsVisible = $this->settings->getBool(AdminSettingsService::KEY_DEFAULT_COMMENTS_VISIBLE, true);
        $now = now();

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
            'bids_visible' => $validated['bids_visible'] ?? $defaultBidsVisible,
            'show_comments' => $validated['show_comments'] ?? $defaultCommentsVisible,
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
                'phone' => $validated['contact_phone'] ?? false,
                'messages' => $validated['contact_messages'] ?? false,
                'phone_number' => $validated['contact_phone_number'] ?? null,
            ],
            'contact_by_call' => (bool) ($validated['contact_phone'] ?? false),
            'contact_phone' => $validated['contact_phone_number'] ?? null,
            'shipping_details' => [
                'free_shipping' => $validated['free_shipping'] ?? false,
                'free_return' => $validated['free_return'] ?? false,
                'return_days' => $validated['return_days'] ?? null,
                'view_at_client' => $validated['view_at_client'] ?? false,
            ],
            'view_at_location' => (bool) ($validated['view_at_client'] ?? false),
            'free_shipping' => (bool) ($validated['free_shipping'] ?? false),
            'free_return' => (bool) ($validated['free_return'] ?? false),
            'location_lat' => $validated['location_lat'] ?? null,
            'location_lng' => $validated['location_lng'] ?? null,
            'location_address' => $validated['location_address'] ?? null,
            'status' => ($autoPublish && $payoutActivation === 'active') ? 'published' : 'pending_review',
            'moderation_status' => $autoPublish ? 'approved' : 'pending',
            'payout_activation_status' => $payoutActivation,
            'published_at' => ($autoPublish && $payoutActivation === 'active') ? $now : null,
            'bumped_at' => ($autoPublish && $payoutActivation === 'active') ? $now : null,
        ]);

        $this->syncListingAttributes($request, $product, $validated);

        if ($payoutActivation !== 'active') {
            app(\App\Services\Finance\FinancialNotificationDispatcher::class)
                ->listingPendingActivation($user, $product);
        }

        return response()->json([
            'message' => $autoPublish
                ? 'تم نشر إعلانك بنجاح'
                : 'تم إضافة إعلانك وسيتم مراجعته قريباً',
            'data' => new ProductResource($product->load(['category', 'subcategory.category', 'region', 'city', 'seller', 'realEstateDetail'])),
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
        if ($error = $this->wholesaleGuardError($request->user(), $validated['is_wholesale'] ?? $product->is_wholesale)) {
            return $error;
        }
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
                'phone' => $validated['contact_phone'] ?? ($product->contact_preferences['phone'] ?? false),
                'messages' => $validated['contact_messages'] ?? ($product->contact_preferences['messages'] ?? false),
                'phone_number' => $validated['contact_phone_number'] ?? ($product->contact_preferences['phone_number'] ?? null),
            ],
            'contact_by_call' => (bool) ($validated['contact_phone'] ?? ($product->contact_by_call ?? false)),
            'contact_phone' => $validated['contact_phone_number'] ?? $product->contact_phone,
            'shipping_details' => [
                'free_shipping' => $validated['free_shipping'] ?? ($product->shipping_details['free_shipping'] ?? false),
                'free_return' => $validated['free_return'] ?? ($product->shipping_details['free_return'] ?? false),
                'return_days' => $validated['return_days'] ?? ($product->shipping_details['return_days'] ?? null),
                'view_at_client' => $validated['view_at_client'] ?? ($product->shipping_details['view_at_client'] ?? false),
            ],
            'view_at_location' => (bool) ($validated['view_at_client'] ?? ($product->view_at_location ?? false)),
            'free_shipping' => (bool) ($validated['free_shipping'] ?? ($product->free_shipping ?? false)),
            'free_return' => (bool) ($validated['free_return'] ?? ($product->free_return ?? false)),
            'location_lat' => array_key_exists('location_lat', $validated) ? $validated['location_lat'] : $product->location_lat,
            'location_lng' => array_key_exists('location_lng', $validated) ? $validated['location_lng'] : $product->location_lng,
            'location_address' => array_key_exists('location_address', $validated) ? $validated['location_address'] : $product->location_address,
        ]);

        $this->syncListingAttributes($request, $product, $validated);

        return response()->json([
            'data' => new ProductResource($product->fresh()->load(['category', 'subcategory.category', 'region', 'city', 'seller', 'realEstateDetail'])),
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncListingAttributes(StoreProductRequest $request, Product $product, array $validated): void
    {
        $category = Category::query()->find($product->category_id);
        $usesSchema = $category && $this->listingSchemas->isDynamicSchemaEnabled($category);
        $attrs = is_array($validated['listing_attributes'] ?? null) ? $validated['listing_attributes'] : [];

        if ($usesSchema && $attrs !== []) {
            $schema = $this->listingSchemas->resolvePublishedSchema(
                (int) $product->category_id,
                $product->subcategory_id ? (int) $product->subcategory_id : null,
                $product->type ?? 'offer'
            );
            if ($schema) {
                $this->attributeSchema->sync($product, $attrs, $schema->id);
            }
            if ($request->isRealEstateListingSelection()) {
                $rePayload = $this->reAdapter->toRealEstatePayload($attrs);
                if ($rePayload !== []) {
                    $this->realEstateService->sync($product, $rePayload);
                }
            }

            return;
        }

        if ($request->isRealEstateListingSelection() && is_array($validated['real_estate'] ?? null)) {
            $this->realEstateService->sync($product, $validated['real_estate']);
        }

        if ($attrs !== []) {
            app(\App\Services\Finance\ListingAttributeService::class)->sync($product, $attrs);
        }
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

        if ($error = $this->wholesaleGuardError($request->user(), (bool) $product->is_wholesale)) {
            return $error;
        }

        if ($product->status === 'published') {
            return response()->json([
                'message' => 'تم نشر الإعلان بنجاح',
                'data' => new ProductResource($product->fresh()->load(['category', 'subcategory', 'region', 'city', 'seller'])),
            ]);
        }

        if ($product->status !== 'pending_review') {
            return response()->json(['message' => 'يمكن نشر الإعلانات قيد المراجعة فقط'], 422);
        }

        $product->update([
            'status' => 'published',
            'moderation_status' => 'approved',
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

    private function wholesaleGuardError($user, bool $isWholesale): ?JsonResponse
    {
        if (! $isWholesale) {
            return null;
        }

        $company = $user->company;
        $approved = $company && $company->verification_status === 'approved'
            && ($user->company_verification_status ?? null) === 'approved'
            && $user->role === 'company';

        if ($approved) {
            return null;
        }

        return response()->json([
            'message' => __('verification.wholesale_requires_approved_company'),
            'code' => 'WHOLESALE_VERIFICATION_REQUIRED',
        ], 403);
    }
}
