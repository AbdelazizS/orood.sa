<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $searches = $request->user()->savedSearches()->orderByDesc('created_at')->get();

        return response()->json(['data' => $searches]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'max:255'],
            'filters' => ['nullable', 'array'],
            'name' => ['nullable', 'string', 'max:100'],
        ]);

        $search = $request->user()->savedSearches()->create($validated);

        return response()->json(['data' => $search], 201);
    }

    public function destroy(Request $request, SavedSearch $savedSearch): JsonResponse
    {
        if ($savedSearch->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $savedSearch->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
