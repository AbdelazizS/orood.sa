<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Purchase;
use App\Models\Review;
use App\Support\InAppNotificationPayload;
use App\Services\PurchaseFulfillment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * List orders (as buyer or seller).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $request->query('role', 'all'); // buyer, seller, all
        $status = $request->query('status');

        $query = Purchase::with(['product', 'buyer', 'seller'])
            ->when($role === 'buyer', fn ($q) => $q->where('buyer_id', $user->id))
            ->when($role === 'seller', fn ($q) => $q->where('seller_id', $user->id))
            ->when($role === 'all', fn ($q) => $q->where(function ($q) use ($user) {
                $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id);
            }))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at');

        $orders = $query->paginate(20);

        $data = $orders->getCollection()->map(fn ($p) => $this->formatOrder($p, $user->id));
        $orders->setCollection($data);

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * Get single order.
     */
    public function show(Request $request, Purchase $order): JsonResponse
    {
        $user = $request->user();
        if ($order->buyer_id !== $user->id && $order->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order->load(['product.category', 'buyer', 'seller']);

        return response()->json([
            'data' => $this->formatOrder($order, $user->id),
        ]);
    }

    /**
     * Update order: seller dispatches/delivers, buyer confirms receipt.
     */
    public function update(Request $request, Purchase $order): JsonResponse
    {
        $user = $request->user();

        if ($order->buyer_id !== $user->id && $order->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Buyer confirming receipt
        if ($request->has('confirm_receipt') && $request->confirm_receipt && $order->buyer_id === $user->id) {
            $request->merge(['purchase_id' => $order->id]);
            return app(AccountController::class)->confirmReceipt($request);
        }

        // Seller updating dispatch/tracking / marking delivered
        if ($order->seller_id === $user->id) {
            $wasShippedAlready = $order->status === Purchase::STATUS_SHIPPED;

            $validated = $request->validate([
                'tracking_number' => ['nullable', 'string', 'max:100'],
                'carrier' => ['nullable', 'string', 'max:100'],
                'tracking_url' => ['nullable', 'string', 'url', 'max:500'],
                'dispatch_out_for_delivery' => ['sometimes', 'boolean'],
                'dispatch_location_confirmed' => ['sometimes', 'boolean'],
                'mark_delivered' => ['sometimes', 'boolean'],
                'accept_cod' => ['sometimes', 'boolean'],
            ]);

            $acceptCod = (bool) ($validated['accept_cod'] ?? false);
            unset($validated['accept_cod']);

            if ($acceptCod) {
                if ($order->payment_method !== 'cod') {
                    return response()->json(['message' => __('This action applies only to cash on delivery orders.')], 422);
                }
                if ($order->cod_seller_accepted_at !== null) {
                    return response()->json(['message' => __('This order was already accepted.')], 422);
                }
                if (!in_array($order->status, [Purchase::STATUS_COD_REQUESTED, Purchase::STATUS_PENDING], true)) {
                    return response()->json(['message' => __('Order cannot be accepted in its current status.')], 422);
                }
                $order->update([
                    'cod_seller_accepted_at' => now(),
                    'status' => Purchase::STATUS_PENDING,
                ]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_pending'));

                return response()->json([
                    'message' => __('Cash on delivery order accepted. You can now add shipment details.'),
                    'data' => $this->formatOrder($order->fresh(['product', 'buyer', 'seller']), $user->id),
                ]);
            }

            $markDelivered = (bool) ($validated['mark_delivered'] ?? false);
            unset($validated['mark_delivered']);
            $dispatchOutForDelivery = (bool) ($validated['dispatch_out_for_delivery'] ?? false);
            $dispatchLocationConfirmed = (bool) ($validated['dispatch_location_confirmed'] ?? false);
            unset($validated['dispatch_out_for_delivery'], $validated['dispatch_location_confirmed']);

            $trackingPayload = array_filter($validated, fn ($v) => $v !== null && $v !== '');

            $hasTrackingNumber = isset($trackingPayload['tracking_number'])
                && $trackingPayload['tracking_number'] !== '';

            if ($order->payment_method === 'cod'
                && $hasTrackingNumber
                && (
                    $order->status === Purchase::STATUS_COD_REQUESTED
                    || ($order->status === Purchase::STATUS_PENDING && $order->cod_seller_accepted_at === null)
                )) {
                return response()->json([
                    'message' => __('Accept this cash-on-delivery order before adding shipment details.'),
                ], 422);
            }

            if ($trackingPayload !== []) {
                $order->update($trackingPayload);
            }

            if ($dispatchOutForDelivery) {
                $mayDispatchEscrow = in_array($order->status, [Purchase::STATUS_AWAITING_PAYMENT], true);
                $mayDispatchCod = $order->payment_method === 'cod'
                    && $order->status === Purchase::STATUS_PENDING
                    && $order->cod_seller_accepted_at !== null;
                if (! ($mayDispatchEscrow || $mayDispatchCod)) {
                    return response()->json([
                        'message' => __('Order cannot be marked as out for delivery in its current status.'),
                    ], 422);
                }
                if (! $dispatchLocationConfirmed) {
                    return response()->json([
                        'message' => __('Please confirm delivery location before marking out for delivery.'),
                    ], 422);
                }
                if ($order->shipping_lat === null || $order->shipping_lng === null) {
                    return response()->json([
                        'message' => __('Shipping location is missing. Buyer must set delivery location first.'),
                    ], 422);
                }
                $order->update(['status' => Purchase::STATUS_SHIPPED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_shipped'));
            } elseif (in_array($order->status, [Purchase::STATUS_AWAITING_PAYMENT], true) && $hasTrackingNumber) {
                $order->update(['status' => Purchase::STATUS_SHIPPED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_shipped'));
            } elseif ($order->payment_method === 'cod'
                && $order->status === Purchase::STATUS_PENDING
                && $order->cod_seller_accepted_at !== null
                && $hasTrackingNumber) {
                $order->update(['status' => Purchase::STATUS_SHIPPED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_shipped'));
            }

            $order->refresh();

            if ($markDelivered) {
                if (!$wasShippedAlready) {
                    return response()->json([
                        'message' => __('You can mark as delivered only after the order is already shipped. Save shipment details first, then mark delivered.'),
                    ], 422);
                }
                if ($order->status !== Purchase::STATUS_SHIPPED) {
                    return response()->json([
                        'message' => __('Order cannot be marked as delivered in its current status.'),
                    ], 422);
                }
                $order->update(['status' => Purchase::STATUS_DELIVERED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_delivered'));
            }

            return response()->json([
                'message' => $markDelivered
                    ? __('Marked as delivered.')
                    : ($dispatchOutForDelivery ? __('Marked as out for delivery.') : __('Order updated.')),
                'data' => $this->formatOrder($order->fresh(['product', 'buyer', 'seller']), $user->id),
            ]);
        }

        return response()->json(['message' => 'Invalid action'], 422);
    }

    /**
     * Buyer confirms delivery (receipt).
     */
    public function confirm(Request $request, Purchase $order): JsonResponse
    {
        $request->merge(['purchase_id' => $order->id]);
        return app(AccountController::class)->confirmReceipt($request);
    }

    /**
     * Cancel order (buyer or seller, only in pending/paid).
     */
    public function cancel(Request $request, Purchase $order): JsonResponse
    {
        $user = $request->user();
        if ($order->buyer_id !== $user->id && $order->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($order->status, [
            Purchase::STATUS_PENDING,
            Purchase::STATUS_COD_REQUESTED,
            Purchase::STATUS_AWAITING_PAYMENT,
        ], true)) {
            return response()->json(['message' => 'Order cannot be cancelled in current status'], 422);
        }

        try {
            DB::transaction(function () use ($order) {
                if ($order->status === Purchase::STATUS_AWAITING_PAYMENT && $order->payment_method === 'escrow') {
                    PurchaseFulfillment::refundEscrowToBuyer($order);
                }
                $order->update(['status' => Purchase::STATUS_CANCELLED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_cancelled'));
                Notification::create(InAppNotificationPayload::orderStatusForSeller($order->fresh(['product']), 'order_cancelled'));
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => __('Order cancelled.'),
            'data' => $this->formatOrder($order->fresh(['product', 'buyer', 'seller']), $user->id),
        ]);
    }

    /**
     * Open dispute (buyer or seller).
     */
    public function dispute(Request $request, Purchase $order): JsonResponse
    {
        $user = $request->user();
        if ($order->buyer_id !== $user->id && $order->seller_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if (!in_array($order->status, [
            Purchase::STATUS_PENDING,
            Purchase::STATUS_COD_REQUESTED,
            Purchase::STATUS_AWAITING_PAYMENT,
            Purchase::STATUS_SHIPPED,
            Purchase::STATUS_DELIVERED,
        ], true)) {
            return response()->json(['message' => __('Dispute cannot be opened for this order.')], 422);
        }

        $order->update(['status' => Purchase::STATUS_DISPUTED]);
        Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_disputed'));
        Notification::create(InAppNotificationPayload::orderStatusForSeller($order->fresh(['product']), 'order_disputed'));

        return response()->json([
            'message' => __('Dispute opened. Admin will review.'),
            'data' => $this->formatOrder($order->fresh(['product', 'buyer', 'seller']), $user->id),
        ]);
    }

    private function formatOrder(Purchase $order, int $currentUserId): array
    {
        $product = $order->product;
        $media = is_array($product?->media) ? $product->media : [];
        $imageUrl = $media['cover'] ?? $media['image_url'] ?? $product?->image_url ?? null;

        $canReviewSeller = false;
        if ($order->buyer_id === $currentUserId
            && $order->seller_id
            && in_array($order->status, [Purchase::STATUS_DELIVERED, Purchase::STATUS_COMPLETED], true)
            && \Schema::hasColumn('reviews', 'purchase_id')) {
            $canReviewSeller = ! Review::where('reviewer_id', $currentUserId)
                ->where('reviewee_id', $order->seller_id)
                ->where('purchase_id', $order->id)
                ->exists();
        }

        return [
            'id' => $order->id,
            'order_number' => 'ORD-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
            'created_at' => $order->created_at,
            'status' => $order->status,
            'payment_method' => $order->payment_method,
            'amount' => (float) $order->amount,
            'quantity' => (int) ($order->quantity ?? 1),
            'buyer_note' => $order->buyer_note,
            'cod_seller_accepted_at' => $order->cod_seller_accepted_at,
            'tracking_number' => $order->tracking_number,
            'carrier' => $order->carrier,
            'tracking_url' => $order->tracking_url,
            'invoice_url' => $order->invoice_url,
            'shipping_address' => $order->shipping_address,
            'shipping_lat' => $order->shipping_lat,
            'shipping_lng' => $order->shipping_lng,
            'product' => $product ? [
                'id' => $product->id,
                'title' => $product->title,
                'image_url' => $imageUrl,
                'price' => $product->price,
            ] : null,
            'buyer' => $order->buyer ? [
                'id' => $order->buyer->id,
                'name' => $order->buyer->name,
                'phone' => $order->buyer->phone,
            ] : null,
            'seller' => $order->seller ? [
                'id' => $order->seller->id,
                'name' => $order->seller->name,
                'username' => $order->seller->username,
                'avatar_url' => $order->seller->avatar_url,
                'phone' => $order->seller->phone,
            ] : null,
            'is_buyer' => $order->buyer_id === $currentUserId,
            'is_seller' => $order->seller_id === $currentUserId,
            'can_confirm_receipt' => $order->buyer_id === $currentUserId
                && PurchaseFulfillment::buyerMayConfirmReceipt($order),
            'can_accept_cod' => $order->seller_id === $currentUserId
                && $order->payment_method === 'cod'
                && $order->cod_seller_accepted_at === null
                && in_array($order->status, [Purchase::STATUS_COD_REQUESTED, Purchase::STATUS_PENDING], true),
            'can_add_tracking' => $order->seller_id === $currentUserId
                && (
                    in_array($order->status, [Purchase::STATUS_AWAITING_PAYMENT, Purchase::STATUS_SHIPPED], true)
                    || (
                        $order->payment_method === 'cod'
                        && $order->status === Purchase::STATUS_PENDING
                        && $order->cod_seller_accepted_at !== null
                    )
                ),
            'can_dispatch_out_for_delivery' => $order->seller_id === $currentUserId
                && (
                    in_array($order->status, [Purchase::STATUS_AWAITING_PAYMENT], true)
                    || (
                        $order->payment_method === 'cod'
                        && $order->status === Purchase::STATUS_PENDING
                        && $order->cod_seller_accepted_at !== null
                    )
                ),
            'can_mark_delivered' => $order->seller_id === $currentUserId
                && $order->status === Purchase::STATUS_SHIPPED,
            'can_review_seller' => $canReviewSeller,
        ];
    }
}
