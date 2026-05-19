<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderEditPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderEditPolicyController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => OrderEditPolicy::globalPolicy()]);
    }

    public function update(Request $request): JsonResponse
    {
        $policy = OrderEditPolicy::globalPolicy();
        $validated = $request->validate([
            'max_text_edits' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'max_price_edits' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'max_location_edits' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'edit_window_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
            'location_edit_window_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
            'location_edit_until_status' => ['sometimes', 'string', 'in:pending,shipped'],
            'location_edit_active' => ['sometimes', 'boolean'],
            'image_edit_requires_approval' => ['sometimes', 'boolean'],
            'price_edit_requires_approval' => ['sometimes', 'boolean'],
            'auto_approve_text_only' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $policy->update($validated);

        return response()->json(['data' => $policy->fresh()]);
    }
}
