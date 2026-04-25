<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ListingReport;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListingReportController extends Controller
{
    public function store(Request $request, Product $listing): JsonResponse
    {
        $user = $request->user() ?? $this->resolveTokenUser($request);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'reason' => ['nullable', 'string', 'max:255'],
            'email' => $user ? ['nullable', 'email', 'max:255'] : ['required', 'email', 'max:255'],
        ]);

        if ($user && ListingReport::query()
            ->where('product_id', $listing->id)
            ->where('user_id', $user->id)
            ->whereIn('status', [ListingReport::STATUS_NEW, ListingReport::STATUS_INVESTIGATING])
            ->exists()) {
            return response()->json([
                'message' => __('You already have an active report for this listing.'),
            ], 422);
        }

        ListingReport::create([
            'product_id' => $listing->id,
            'user_id' => $user?->id,
            'email' => $user ? ($user->email ?? null) : $validated['email'],
            'reason' => $validated['reason'] ?? null,
            'message' => $validated['message'],
            'status' => ListingReport::STATUS_NEW,
        ]);

        return response()->json([
            'message' => __('Report received. Thank you.'),
        ], 201);
    }

    private function resolveTokenUser(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $hashedToken = hash('sha256', $token);
        return User::query()
            ->where('api_token', $hashedToken)
            ->where('api_token_expires_at', '>', now())
            ->first();
    }
}

