<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\SubcategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = cache()->remember('api.categories', now()->addMinutes(30), function () {
            return Category::query()
                ->with([
                    'subcategories' => fn ($q) => $q
                        ->whereNull('parent_id')
                        ->where('is_active', true)
                        ->withCount('children')
                        ->with(['childrenRecursive'])
                        ->orderBy('sort_order')
                        ->orderBy('id'),
                ])
                ->where('is_active', true)
                ->get();
        });

        return CategoryResource::collection($categories);
    }

    public function subcategories(Request $request, Category $category)
    {
        $parentId = $request->query('parent_id');

        $query = $category->subcategories()
            ->where('is_active', true)
            ->withCount('children')
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($parentId === null || $parentId === '') {
            $query->whereNull('parent_id');
        } else {
            $query->where('parent_id', (int) $parentId);
        }

        return SubcategoryResource::collection($query->get());
    }

    public function tree()
    {
        $roots = Category::query()
            ->with(['subcategories', 'children'])
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return CategoryResource::collection($roots);
    }

    public function bySlug(string $slug)
    {
        $category = Category::query()
            ->with(['subcategories', 'children', 'parent'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return new CategoryResource($category);
    }
}
