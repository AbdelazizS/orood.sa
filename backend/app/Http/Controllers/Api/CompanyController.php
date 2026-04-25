<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\ProductResource;
use App\Models\Company;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    private function wholesaleProductsBaseQuery()
    {
        return Product::query()
            ->publiclyListed()
            ->where('is_wholesale', true)
            ->whereNotNull('wholesale_price');
    }

    private function companyWholesaleSummary(Company $company): array
    {
        $publishedWholesaleProducts = (int) $this->wholesaleProductsBaseQuery()
            ->where('user_id', $company->user_id)
            ->count();

        return [
            'id' => $company->id,
            'slug' => $company->slug,
            'name' => $company->name,
            'description' => $company->description,
            'city' => $company->city?->name,
            'region' => $company->region?->name,
            'category' => $company->category?->name,
            'verification_status' => $company->verification_status,
            'is_verified' => $company->verification_status === 'approved',
            'products_count' => $publishedWholesaleProducts,
            'logo_url' => $company->user?->avatar ?: $company->user?->image,
            'user' => [
                'id' => $company->user?->id,
                'name' => $company->user?->name,
            ],
        ];
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

        $query = Company::query()
            ->with(['category', 'region', 'city', 'user:id,name,image,avatar'])
            ->where('verification_status', 'approved')
            ->whereHas('products', fn ($q) => $q
                ->publiclyListed()
                ->where('is_wholesale', true)
                ->whereNotNull('wholesale_price')
            );

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('product_types', 'like', "%{$search}%");
            });
        }

        if ($cityId > 0) {
            $query->where('city_id', $cityId);
        }

        if ($categoryId > 0) {
            $query->where('category_id', $categoryId);
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

    public function wholesaleShow(Company $company): JsonResponse
    {
        $company->load(['category', 'region', 'city', 'user:id,name,image,avatar']);

        if ($company->verification_status !== 'approved') {
            return response()->json(['message' => __('Company not found')], 404);
        }

        $featured = $this->wholesaleProductsBaseQuery()
            ->where('user_id', $company->user_id)
            ->with(['seller.company', 'category', 'subcategory', 'region', 'city'])
            ->orderByDesc('published_at')
            ->limit(8)
            ->get();

        return response()->json([
            'data' => [
                'company' => $this->companyWholesaleSummary($company),
                'featured_products' => ProductResource::collection($featured),
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

        return response()->json([
            'data' => ProductResource::collection($products->items()),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }
}
