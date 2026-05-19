<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CodPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCodPolicyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => CodPolicy::query()->orderByDesc('priority')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope' => ['required', 'in:global,category,city,seller,listing'],
            'scope_id' => ['nullable', 'integer'],
            'enabled' => ['required', 'boolean'],
            'buyer_must_accept' => ['boolean'],
            'seller_can_toggle' => ['boolean'],
            'priority' => ['integer', 'min:0'],
        ]);

        $policy = CodPolicy::create($validated);

        return response()->json(['data' => $policy], 201);
    }

    public function update(Request $request, CodPolicy $codPolicy): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'buyer_must_accept' => ['sometimes', 'boolean'],
            'seller_can_toggle' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', 'integer', 'min:0'],
        ]);

        $codPolicy->update($validated);

        return response()->json(['data' => $codPolicy->fresh()]);
    }

    public function destroy(CodPolicy $codPolicy): JsonResponse
    {
        $codPolicy->delete();

        return response()->json(['message' => __('finance.cod_policy_deleted')]);
    }
}
