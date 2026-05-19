<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CategoryFieldDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCategoryFieldController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CategoryFieldDefinition::query()->orderBy('sort_order');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('subcategory_id')) {
            $query->where('subcategory_id', $request->integer('subcategory_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'exists:subcategories,id'],
            'field_key' => ['required', 'string', 'max:64'],
            'field_type' => ['required', 'string', 'max:32'],
            'label_ar' => ['required', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'validation_rules' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'filterable' => ['boolean'],
            'show_on_card' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $field = CategoryFieldDefinition::create($validated);

        return response()->json(['data' => $field], 201);
    }

    public function update(Request $request, CategoryFieldDefinition $categoryField): JsonResponse
    {
        $validated = $request->validate([
            'label_ar' => ['sometimes', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'validation_rules' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'filterable' => ['sometimes', 'boolean'],
            'show_on_card' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $categoryField->update($validated);

        return response()->json(['data' => $categoryField->fresh()]);
    }

    public function destroy(CategoryFieldDefinition $categoryField): JsonResponse
    {
        $categoryField->delete();

        return response()->json(['message' => 'deleted']);
    }
}
