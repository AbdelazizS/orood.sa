<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ViewRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ViewRequestController extends Controller
{
    /**
     * Create a view-at-location request.
     */
    public function __invoke(Request $request, Product $product): JsonResponse
    {
        if (!$product->view_at_location) {
            return response()->json(['message' => 'View at location is not enabled for this listing'], 422);
        }

        $validated = $request->validate([
            'scheduled_date' => ['required', 'date', 'after:now'],
            'location_lat' => ['nullable', 'numeric'],
            'location_lng' => ['nullable', 'numeric'],
            'location_address' => ['nullable', 'string', 'max:500'],
        ]);

        $viewRequest = ViewRequest::create([
            'product_id' => $product->id,
            'requester_id' => $request->user()->id,
            'scheduled_date' => $validated['scheduled_date'],
            'location_lat' => $validated['location_lat'] ?? null,
            'location_lng' => $validated['location_lng'] ?? null,
            'location_address' => $validated['location_address'] ?? null,
            'status' => 'PENDING',
        ]);

        return response()->json([
            'message' => 'View request submitted',
            'data' => $viewRequest->load('requester'),
        ], 201);
    }
}
