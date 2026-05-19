<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\Listings\ListingSchemaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListingSchemaController extends Controller
{
    public function __construct(private readonly ListingSchemaService $schemas) {}

    public function show(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'subcategory_id' => ['nullable', 'integer', 'exists:subcategories,id'],
            'type' => ['nullable', 'string', 'in:offer,request'],
        ]);

        if (! $this->schemas->isDynamicSchemaEnabled($category)) {
            return response()->json([
                'data' => null,
                'dynamic_schema_enabled' => false,
            ]);
        }

        $listingType = $validated['type'] ?? 'offer';
        $schema = $this->schemas->resolvePublishedSchema(
            $category->id,
            $validated['subcategory_id'] ?? null,
            $listingType
        );

        if (! $schema) {
            return response()->json([
                'data' => null,
                'dynamic_schema_enabled' => true,
                'message' => 'No published schema for this category.',
            ], 404);
        }

        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';

        return response()->json([
            'data' => $this->schemas->serializeForApi($schema, $locale),
            'dynamic_schema_enabled' => true,
        ]);
    }
}
