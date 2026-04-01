<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Http\Requests\FeedRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductFeedService;

class HomeFeedController extends Controller
{
    public function __construct(private ProductFeedService $productFeedService)
    {
    }

    public function __invoke(FeedRequest $request)
    {
        $filters = $request->validatedFilters();
        $paginator = $this->productFeedService->paginatedFeed($filters);

        $categoryRestricted = false;
        if ($paginator->total() === 0 && !empty($filters['category_id']) && !empty($filters['region_id'])) {
            $category = Category::with('regions')->find($filters['category_id']);
            if ($category && $category->regions->isNotEmpty()) {
                $visible = $category->regions->firstWhere('id', $filters['region_id']);
                $categoryRestricted = !$visible || !($visible->pivot->is_visible ?? true);
            }
        }

        return ProductResource::collection($paginator)->additional([
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'has_more' => $paginator->hasMorePages(),
                'category_restricted' => $categoryRestricted,
            ],
        ]);
    }
}
