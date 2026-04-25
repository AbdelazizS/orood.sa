<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ViewRequestResource;
use App\Models\Notification;
use App\Models\Product;
use App\Support\InAppNotificationPayload;
use App\Models\ViewRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class ViewRequestController extends Controller
{
    public const STATUS_PENDING = 'PENDING';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_DECLINED = 'DECLINED';

    public const STATUS_CANCELLED = 'CANCELLED';

    /**
     * Create a view-at-location request.
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        if (! $product->view_at_location) {
            return response()->json(['message' => 'View at location is not enabled for this listing'], 422);
        }

        $rules = [
            'scheduled_date' => ['required', 'date', 'after:now'],
            'location_lat' => ['nullable', 'numeric'],
            'location_lng' => ['nullable', 'numeric'],
            'location_address' => ['nullable', 'string', 'max:500'],
        ];
        if (Schema::hasColumn('view_requests', 'location_place_id')) {
            $rules['location_place_id'] = ['nullable', 'string', 'max:255'];
        }
        $validated = $request->validate($rules);

        $payload = [
            'product_id' => $product->id,
            'requester_id' => $request->user()->id,
            'scheduled_date' => $validated['scheduled_date'],
            'location_lat' => $validated['location_lat'] ?? null,
            'location_lng' => $validated['location_lng'] ?? null,
            'location_address' => $validated['location_address'] ?? null,
            'status' => self::STATUS_PENDING,
        ];
        if (Schema::hasColumn('view_requests', 'location_place_id')) {
            $payload['location_place_id'] = $validated['location_place_id'] ?? null;
        }

        $viewRequest = ViewRequest::create($payload);

        Notification::create(
            InAppNotificationPayload::viewRequestNew(
                $product,
                (int) $viewRequest->id,
                (int) $request->user()->id,
                $viewRequest->scheduled_date?->toIso8601String()
            )
        );

        return response()->json([
            'message' => 'View request submitted',
            'data' => new ViewRequestResource($viewRequest->load(['requester', 'product'])),
        ], 201);
    }

    /**
     * Buyer: list own view requests.
     */
    public function indexMine(Request $request): JsonResponse
    {
        $rows = ViewRequest::query()
            ->where('requester_id', $request->user()->id)
            ->with(['product:id,title,status,user_id'])
            ->orderByDesc('created_at')
            ->paginate(perPage: (int) $request->query('per_page', 20));

        return ViewRequestResource::collection($rows)->response();
    }

    /**
     * Seller: incoming view requests across owned listings.
     */
    public function indexIncoming(Request $request): JsonResponse
    {
        $rows = ViewRequest::query()
            ->whereHas('product', fn ($q) => $q->where('user_id', $request->user()->id))
            ->with(['product:id,title,status,user_id', 'requester:id,name,username,avatar_url,is_verified'])
            ->orderByDesc('created_at')
            ->paginate(perPage: (int) $request->query('per_page', 20));

        return ViewRequestResource::collection($rows)->response();
    }

    /**
     * Seller: list view requests for a listing.
     */
    public function indexForProduct(Request $request, Product $product): JsonResponse
    {
        if ((int) $product->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $rows = ViewRequest::query()
            ->where('product_id', $product->id)
            ->with(['requester:id,name,username'])
            ->orderByDesc('created_at')
            ->paginate(perPage: (int) $request->query('per_page', 30));

        return ViewRequestResource::collection($rows)->response();
    }

    /**
     * Buyer cancels (PENDING → CANCELLED). Seller approves or declines (PENDING → APPROVED / DECLINED).
     */
    public function update(Request $request, ViewRequest $viewRequest): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in([
                self::STATUS_APPROVED,
                self::STATUS_DECLINED,
                self::STATUS_CANCELLED,
            ])],
            'seller_note' => ['nullable', 'string', 'max:500'],
        ]);
        $next = $validated['status'];

        if ($viewRequest->status !== self::STATUS_PENDING) {
            return response()->json(['message' => 'Request is no longer pending'], 422);
        }

        $product = $viewRequest->product()->firstOrFail();

        if ($next === self::STATUS_CANCELLED) {
            if ((int) $viewRequest->requester_id !== (int) $user->id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            $viewRequest->update(['status' => self::STATUS_CANCELLED]);
            Notification::create(
                InAppNotificationPayload::viewRequestCancelled($product, (int) $viewRequest->id)
            );
        } else {
            if ((int) $product->user_id !== (int) $user->id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            $viewRequest->update([
                'status' => $next,
                'seller_note' => $validated['seller_note'] ?? null,
            ]);
            Notification::create(
                InAppNotificationPayload::viewRequestDecisionForBuyer(
                    $product,
                    (int) $viewRequest->id,
                    (int) $viewRequest->requester_id,
                    $next
                )
            );
        }

        return response()->json([
            'message' => 'Updated',
            'data' => new ViewRequestResource($viewRequest->fresh()->load(['requester', 'product'])),
        ]);
    }
}
