<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Company;
use App\Models\GroupBuyReservation;
use App\Models\Product;
use App\Services\CompanyLocationSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    private function wholesaleProductsBaseQuery()
    {
        return Product::query()
            ->publiclyListed()
            ->where('is_wholesale', true)
            ->whereNotNull('wholesale_price');
    }

    /**
     * @return array{
     *   active_wholesale_campaigns_count: int,
     *   completed_wholesale_campaigns_count: int,
     *   total_wholesale_seats_reserved: int,
     *   distinct_wholesale_buyers_count: int
     * }
     */
    private function wholesaleCampaignMetricsForUser(int $userId): array
    {
        $rows = $this->wholesaleProductsBaseQuery()
            ->where('user_id', $userId)
            ->get(['id', 'min_quantity', 'wholesale_expires_at']);

        if ($rows->isEmpty()) {
            return [
                'active_wholesale_campaigns_count' => 0,
                'completed_wholesale_campaigns_count' => 0,
                'total_wholesale_seats_reserved' => 0,
                'distinct_wholesale_buyers_count' => 0,
            ];
        }

        $ids = $rows->pluck('id')->all();
        $pending = GroupBuyReservation::STATUS_PENDING;
        $paymentPending = GroupBuyReservation::STATUS_PAYMENT_PENDING;
        $purchased = GroupBuyReservation::STATUS_PURCHASED;

        $sums = GroupBuyReservation::query()
            ->whereIn('product_id', $ids)
            ->whereIn('status', [$pending, $paymentPending])
            ->groupBy('product_id')
            ->selectRaw('product_id, coalesce(sum(quantity),0) as qty')
            ->pluck('qty', 'product_id');

        $active = 0;
        $completed = 0;
        foreach ($rows as $p) {
            $target = max(1, (int) ($p->min_quantity ?? 1));
            $reserved = (int) ($sums[$p->id] ?? 0);
            $isComplete = $reserved >= $target;
            $expired = $p->wholesale_expires_at && $p->wholesale_expires_at->isPast();
            if ($isComplete) {
                $completed++;
            } elseif (! $expired) {
                $active++;
            }
        }

        $totalSeats = (int) GroupBuyReservation::query()
            ->whereIn('product_id', $ids)
            ->whereIn('status', [$pending, $paymentPending, $purchased])
            ->sum('quantity');

        $distinctBuyers = (int) GroupBuyReservation::query()
            ->whereIn('product_id', $ids)
            ->whereIn('status', [$pending, $paymentPending, $purchased])
            ->selectRaw('count(distinct user_id) as c')
            ->value('c');

        return [
            'active_wholesale_campaigns_count' => $active,
            'completed_wholesale_campaigns_count' => $completed,
            'total_wholesale_seats_reserved' => $totalSeats,
            'distinct_wholesale_buyers_count' => $distinctBuyers,
        ];
    }

    private function companyWholesaleSummary(Company $company): array
    {
        $company = app(CompanyLocationSyncService::class)->ensureCompanyMatchesUser($company);

        $publishedWholesaleProducts = (int) $this->wholesaleProductsBaseQuery()
            ->where('user_id', $company->user_id)
            ->count();

        $userCover = trim((string) ($company->user?->cover_photo_url ?? ''));
        $heroCoverUrl = $userCover !== '' ? $userCover : null;

        $metrics = $this->wholesaleCampaignMetricsForUser((int) $company->user_id);
        $desc = trim((string) ($company->description ?? ''));
        $heroTagline = $desc !== '' ? Str::limit($desc, 140) : null;

        $locale = request()->header('Accept-Language');
        $categoryName = $company->category?->getLocalizedName($locale);
        $categoryName = is_string($categoryName) ? trim($categoryName) : '';
        if ($categoryName === '') {
            $modeCategoryId = (int) $this->wholesaleProductsBaseQuery()
                ->where('user_id', $company->user_id)
                ->whereNotNull('category_id')
                ->selectRaw('category_id, count(*) as c')
                ->groupBy('category_id')
                ->orderByDesc('c')
                ->limit(1)
                ->value('category_id');
            if ($modeCategoryId > 0) {
                $inferred = Category::query()->find($modeCategoryId);
                $categoryName = $inferred ? trim((string) $inferred->getLocalizedName($locale)) : '';
            }
        }

        return [
            'id' => $company->id,
            'slug' => $company->slug,
            'name' => $company->name,
            'description' => $company->description,
            'hero_tagline' => $heroTagline,
            'city' => $company->city?->getLocalizedName($locale),
            'region' => $company->region?->getLocalizedName($locale),
            'category' => $categoryName !== '' ? $categoryName : null,
            'verification_status' => $company->verification_status,
            'is_verified' => $company->verification_status === 'approved',
            'products_count' => $publishedWholesaleProducts,
            'rating' => $company->rating !== null ? (float) $company->rating : null,
            'hero_cover_url' => $heroCoverUrl,
            'logo_url' => $company->user?->avatar_url
                ?: $company->user?->logo_url
                ?: $company->user?->avatar
                ?: $company->user?->image,
            'user' => [
                'id' => $company->user?->id,
                'name' => $company->user?->name,
            ],
            ...$metrics,
        ];
    }

    /**
     * @param  iterable<int, Product>  $products
     * @return array<int, array<string, mixed>>
     */
    private function enrichWholesaleProductRows(iterable $products, ?int $userId): array
    {
        $collection = Collection::make($products);
        if ($collection->isEmpty()) {
            return [];
        }

        $ids = $collection->pluck('id')->all();
        $pending = GroupBuyReservation::STATUS_PENDING;
        $paymentPending = GroupBuyReservation::STATUS_PAYMENT_PENDING;

        $reservedSums = GroupBuyReservation::query()
            ->whereIn('product_id', $ids)
            ->whereIn('status', [$pending, $paymentPending])
            ->selectRaw('product_id, coalesce(sum(quantity),0) as qty')
            ->groupBy('product_id')
            ->pluck('qty', 'product_id');

        $mineByProduct = collect();
        if ($userId) {
            $mineByProduct = GroupBuyReservation::query()
                ->whereIn('product_id', $ids)
                ->where('user_id', $userId)
                ->get()
                ->keyBy('product_id');
        }

        return $collection->map(function (Product $product) use ($userId, $reservedSums, $mineByProduct, $pending, $paymentPending) {
            $base = (new ProductResource($product))->resolve();
            $target = max(1, (int) ($base['min_quantity'] ?? 0));
            $reserved = (int) ($reservedSums[$product->id] ?? 0);
            $remaining = max(0, $target - $reserved);
            $discountPercent = (int) ($base['discount_percent'] ?? 0);
            if ($discountPercent <= 0) {
                $price = (float) ($base['price'] ?? 0);
                $wholesalePrice = (float) ($base['wholesale_price'] ?? 0);
                if ($price > 0 && $wholesalePrice > 0 && $wholesalePrice <= $price) {
                    $discountPercent = (int) round((($price - $wholesalePrice) / $price) * 100);
                }
            }

            $mine = $mineByProduct->get($product->id);
            $base['current_buyers'] = $reserved;
            $base['reserved_seats'] = $reserved;
            $base['remaining_needed'] = $remaining;
            $base['progress_percentage'] = (int) min(100, round($target > 0 ? ($reserved / $target) * 100 : 0));
            $base['discount_percent'] = $discountPercent;
            $base['campaign_completed'] = $reserved >= $target;
            $base['user_reserved'] = $mine && in_array((string) $mine->status, [$pending, $paymentPending], true);
            $base['my_reservation'] = $mine ? [
                'id' => $mine->id,
                'quantity' => (int) $mine->quantity,
                'status' => $mine->status,
                'checkout_expires_at' => optional($mine->checkout_expires_at)->toIso8601String(),
                'purchase_id' => $mine->purchase_id,
            ] : null;

            return $base;
        })->values()->all();
    }

    public function index()
    {
        $companies = Company::query()
            ->with(['category', 'region', 'city'])
            ->orderByDesc('rating')
            ->paginate(12);

        return CompanyResource::collection($companies);
    }

    public function show(Company $company): JsonResponse
    {
        $company->load(['category', 'region', 'city', 'user']);

        $products = Product::query()
            ->where('user_id', $company->user_id)
            ->published()
            ->approved()
            ->orderByDesc('published_at')
            ->limit(48)
            ->get();

        return response()->json([
            'data' => [
                'company' => new CompanyResource($company),
                'products' => ProductResource::collection($products),
            ],
        ]);
    }

    public function myStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $user->company()->latest('id')->first();
        $status = $company?->verification_status ?? ($user->company_verification_status ?? 'none');

        return response()->json([
            'data' => [
                'has_company' => (bool) $company,
                'status' => $status,
                'status_text' => match ($status) {
                    'pending' => __('verification.status.pending'),
                    'approved' => __('verification.status.approved'),
                    'rejected' => __('verification.status.rejected'),
                    default => __('verification.status.unverified'),
                },
                'rejection_reason' => $company?->rejection_reason ?? $user->company_verification_note,
                'company' => $company ? [
                    'id' => $company->id,
                    'name' => $company->name,
                    'license_url' => $company->license_url,
                    'reviewed_at' => $company->reviewed_at?->toIso8601String(),
                    'reviewed_by' => $company->reviewed_by,
                ] : null,
                'can_post_wholesale' => $status === 'approved' && $user->role === 'company',
            ],
        ]);
    }

    public function wholesaleCompanies(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $cityId = $request->integer('city_id');
        $categoryId = $request->integer('category_id');
        $regionId = $request->integer('region_id');
        $subcategoryId = $request->integer('subcategory_id');

        $query = Company::query()
            ->with([
                'category',
                'region',
                'city',
                'user:id,name,image,avatar,avatar_url,logo_url,cover_photo_url,city_id',
                'user.city',
                'user.city.region',
            ])
            ->where('verification_status', 'approved')
            ->whereHas('products', function ($q) use ($subcategoryId) {
                $q->publiclyListed()
                    ->where('is_wholesale', true)
                    ->whereNotNull('wholesale_price');
                if ($subcategoryId > 0) {
                    $q->where('subcategory_id', $subcategoryId);
                }
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('product_types', 'like', "%{$search}%");
            });
        }

        if ($cityId > 0) {
            $query->where('city_id', $cityId);
        }

        if ($regionId > 0) {
            $query->where('region_id', $regionId);
        }

        if ($categoryId > 0) {
            $query->where(function ($outer) use ($categoryId, $subcategoryId) {
                $outer->where('companies.category_id', $categoryId)
                    ->orWhere(function ($q) use ($categoryId, $subcategoryId) {
                        $q->whereNull('companies.category_id')
                            ->whereHas('products', function ($pq) use ($categoryId, $subcategoryId) {
                                $pq->publiclyListed()
                                    ->where('is_wholesale', true)
                                    ->whereNotNull('wholesale_price')
                                    ->where('category_id', $categoryId);
                                if ($subcategoryId > 0) {
                                    $pq->where('subcategory_id', $subcategoryId);
                                }
                            });
                    });
            });
        }

        $companies = $query->orderByDesc('rating')->paginate((int) $request->query('per_page', 16));

        return response()->json([
            'data' => collect($companies->items())
                ->map(fn (Company $company) => $this->companyWholesaleSummary($company))
                ->values(),
            'meta' => [
                'current_page' => $companies->currentPage(),
                'last_page' => $companies->lastPage(),
                'per_page' => $companies->perPage(),
                'total' => $companies->total(),
            ],
        ]);
    }

    public function wholesaleShow(Request $request, Company $company): JsonResponse
    {
        $company->load(['category', 'region', 'city', 'user:id,name,image,avatar,avatar_url,logo_url,cover_photo_url']);

        if ($company->verification_status !== 'approved') {
            return response()->json(['message' => __('Company not found')], 404);
        }

        $featured = $this->wholesaleProductsBaseQuery()
            ->where('user_id', $company->user_id)
            ->with(['seller.company', 'category', 'subcategory', 'region', 'city'])
            ->orderByDesc('published_at')
            ->limit(8)
            ->get();

        $userId = $request->user()?->id;

        return response()->json([
            'data' => [
                'company' => $this->companyWholesaleSummary($company),
                'featured_products' => $this->enrichWholesaleProductRows($featured, $userId ? (int) $userId : null),
            ],
        ]);
    }

    public function wholesaleProducts(Request $request, Company $company): JsonResponse
    {
        if ($company->verification_status !== 'approved') {
            return response()->json(['message' => __('Company not found')], 404);
        }

        $query = $this->wholesaleProductsBaseQuery()
            ->where('user_id', $company->user_id)
            ->with(['seller.company', 'category', 'subcategory', 'region', 'city']);

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sort = (string) $request->query('sort', 'newest');
        match ($sort) {
            'price_asc' => $query->orderBy('wholesale_price'),
            'price_desc' => $query->orderByDesc('wholesale_price'),
            'discount' => $query->orderByDesc('discount_percent'),
            default => $query->orderByDesc('published_at'),
        };

        $products = $query->paginate((int) $request->query('per_page', 20));

        $userId = $request->user()?->id;

        return response()->json([
            'data' => $this->enrichWholesaleProductRows($products->items(), $userId ? (int) $userId : null),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }
}
