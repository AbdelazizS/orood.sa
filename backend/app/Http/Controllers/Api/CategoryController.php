<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\SubcategoryResource;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = cache()->remember('api.categories', now()->addMinutes(30), function () {
            return Category::with('subcategories')->where('is_active', true)->get();
        });

        return CategoryResource::collection($categories);
    }

    public function subcategories(Category $category)
    {
        $category->load('subcategories');

        return SubcategoryResource::collection($category->subcategories);
    }
}
