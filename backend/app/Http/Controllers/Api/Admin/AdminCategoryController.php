<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Region;
use App\Models\Subcategory;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AdminCategoryController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    public function index(): JsonResponse
    {
        $categories = Category::with('subcategories', 'regions')->orderBy('name')->get();

        // Ensure all categories have region visibility entries (fix for legacy or newly created)
        $allRegions = Region::all();
        foreach ($categories as $category) {
            if ($category->regions->isEmpty() && $allRegions->isNotEmpty()) {
                $sync = [];
                foreach ($allRegions as $region) {
                    $sync[$region->id] = ['is_visible' => true];
                }
                $category->regions()->sync($sync);
                $category->load('regions');
            }
        }

        return response()->json(['data' => $categories]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'show_company_directory' => ['sometimes', 'boolean'],
        ]);
        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $category = Category::create($validated);
        $regions = Region::all();
        $sync = [];
        foreach ($regions as $region) {
            $sync[$region->id] = ['is_visible' => true, 'wholesale_visible' => false];
        }
        $category->regions()->sync($sync);
        $this->audit->log('category.created', $category, null, $validated);
        Cache::forget('api.categories');

        return response()->json(['data' => $category->load('subcategories', 'regions')], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'show_company_directory' => ['sometimes', 'boolean'],
            'region_visibility' => ['sometimes', 'array'],
            'region_visibility.*' => ['required', 'exists:regions,id'],
            'region_wholesale' => ['sometimes', 'array'],
            'region_wholesale.*' => ['required', 'exists:regions,id'],
        ]);

        $oldValues = $category->getOriginal();
        $updates = [];
        foreach (['name', 'name_ar', 'name_en', 'icon', 'is_active', 'show_company_directory'] as $key) {
            if (array_key_exists($key, $validated)) {
                $updates[$key] = $validated[$key];
            }
        }
        if (!empty($updates)) {
            $category->update($updates);
        }
        if (isset($validated['region_visibility']) || isset($validated['region_wholesale'])) {
            $sync = [];
            $existing = $category->regions->keyBy('id');
            $visibleIds = $validated['region_visibility'] ?? $existing->filter(fn ($r) => $r->pivot->is_visible)->keys()->toArray();
            $wholesaleIds = $validated['region_wholesale'] ?? $existing->filter(fn ($r) => ($r->pivot->wholesale_visible ?? false))->keys()->toArray();
            foreach (Region::all() as $region) {
                $sync[$region->id] = [
                    'is_visible' => in_array($region->id, (array) $visibleIds),
                    'wholesale_visible' => in_array($region->id, (array) $wholesaleIds),
                ];
            }
            $category->regions()->sync($sync);
            $this->audit->log('category.region_visibility_updated', $category, $oldValues, $validated);
        }
        Cache::forget('api.categories');

        return response()->json(['data' => $category->load('regions')]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $this->audit->log('category.deleted', $category, $category->toArray());
        $category->delete();
        Cache::forget('api.categories');
        return response()->json(['message' => 'Category deleted']);
    }

    public function storeSubcategory(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $validated['category_id'] = $category->id;
        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $subcategory = Subcategory::create($validated);
        $this->audit->log('subcategory.created', $subcategory, null, $validated);
        Cache::forget('api.categories');

        return response()->json(['data' => $subcategory], 201);
    }

    public function updateSubcategory(Request $request, Category $category, Subcategory $subcategory): JsonResponse
    {
        if ($subcategory->category_id !== $category->id) {
            return response()->json(['message' => 'Subcategory does not belong to category'], 422);
        }
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        }
        $oldValues = $subcategory->getOriginal();
        $subcategory->update($validated);
        $this->audit->log('subcategory.updated', $subcategory, $oldValues, $validated);
        Cache::forget('api.categories');
        return response()->json(['data' => $subcategory->fresh()]);
    }

    public function destroySubcategory(Category $category, Subcategory $subcategory): JsonResponse
    {
        if ($subcategory->category_id !== $category->id) {
            return response()->json(['message' => 'Subcategory does not belong to category'], 422);
        }
        $this->audit->log('subcategory.deleted', $subcategory, $subcategory->toArray());
        $subcategory->delete();
        Cache::forget('api.categories');
        return response()->json(['message' => 'Subcategory deleted']);
    }

    public function toggleRegion(Request $request, Category $category, Region $region): JsonResponse
    {
        $isVisible = $request->boolean('is_visible', true);
        $pivot = $category->regions()->where('region_id', $region->id)->first()?->pivot;
        $wholesaleVisible = $pivot?->wholesale_visible ?? false;
        $category->regions()->syncWithoutDetaching([
            $region->id => ['is_visible' => $isVisible, 'wholesale_visible' => $wholesaleVisible],
        ]);
        Cache::forget('api.categories');

        return response()->json(['data' => $category->load('regions')]);
    }

    public function toggleWholesale(Request $request, Category $category, Region $region): JsonResponse
    {
        $wholesaleVisible = $request->boolean('wholesale_visible', true);
        $pivot = $category->regions()->where('region_id', $region->id)->first()?->pivot;
        $isVisible = $pivot?->is_visible ?? true;
        $category->regions()->syncWithoutDetaching([
            $region->id => ['is_visible' => $isVisible, 'wholesale_visible' => $wholesaleVisible],
        ]);
        Cache::forget('api.categories');

        return response()->json(['data' => $category->load('regions')]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:categories,id'],
            'is_active' => ['required', 'boolean'],
        ]);
        Category::whereIn('id', $validated['ids'])->update(['is_active' => $validated['is_active']]);
        Cache::forget('api.categories');
        return response()->json(['message' => 'Categories updated', 'count' => count($validated['ids'])]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:categories,id'],
        ]);
        $count = Category::whereIn('id', $validated['ids'])->delete();
        Cache::forget('api.categories');
        return response()->json(['message' => 'Categories deleted', 'count' => $count]);
    }
}
