<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Purchase;
use App\Models\Review;
use App\Support\InAppNotificationPayload;
use App\Services\Orders\OrderLocationEditService;
use App\Services\PurchaseFulfillment;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
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
            return response()->json(['message' => __('orders.unauthorized')], 403);
        }

        $order->load(['product.category', 'buyer', 'seller', 'latestOrderPaymentRequest.values']);

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
            return response()->json(['message' => __('orders.unauthorized')], 403);
        }

        if (
            ($request->has('shipping_lat') || $request->has('shipping_lng') || $request->has('shipping_address'))
            && $order->buyer_id !== $user->id
        ) {
            return response()->json(['message' => __('orders.location_edit_not_allowed')], 422);
        }

        // Buyer confirming receipt
        if ($request->has('confirm_receipt') && $request->confirm_receipt && $order->buyer_id === $user->id) {
            $request->merge(['purchase_id' => $order->id]);
            return app(AccountController::class)->confirmReceipt($request);
        }

        // Buyer updating delivery location (policy-limited)
        if ($order->buyer_id === $user->id
            && ($request->has('shipping_lat') || $request->has('shipping_lng') || $request->has('shipping_address'))) {
            $validated = $request->validate([
                'shipping_address' => ['nullable', 'string', 'max:500'],
                'shipping_lat' => ['required', 'numeric', 'between:-90,90'],
                'shipping_lng' => ['required', 'numeric', 'between:-180,180'],
            ]);

            try {
                $order = app(OrderLocationEditService::class)->updateLocation($order, $user, $validated);
            } catch (InvalidArgumentException $e) {
                if ($e->getMessage() === 'LOCATION_EDIT_NOT_ALLOWED') {
                    return response()->json(['message' => __('orders.location_edit_not_allowed')], 422);
                }

                throw $e;
            }

            return response()->json([
                'message' => __('orders.location_updated'),
                'data' => $this->formatOrder(
                    $order->fresh(['product', 'buyer', 'seller', 'latestOrderPaymentRequest.values']),
                    $user->id,
                ),
            ]);
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
                'confirm_direct_transfer' => ['sometimes', 'boolean'],
            ]);

            if ($request->boolean('confirm_direct_transfer')) {
                if (! $order->isDirectTransfer()) {
                    return response()->json(['message' => __('orders.direct_transfer_action_only')], 422);
                }
                if (! in_array($order->status, [Purchase::STATUS_PENDING, Purchase::STATUS_AWAITING_PAYMENT], true)) {
                    return response()->json(['message' => __('orders.cannot_confirm_transfer_status')], 422);
                }
                if ($order->seller_transfer_confirmed_at !== null) {
                    return response()->json(['message' => __('orders.transfer_already_confirmed')], 422);
                }
                $order->loadMissing('latestOrderPaymentRequest.values');
                if (! $order->hasTransferReceiptUploaded()) {
                    return response()->json(['message' => __('orders.transfer_receipt_required')], 422);
                }

                $updates = [
                    'seller_transfer_confirmed_at' => now(),
                    'transfer_confirmed_by' => $user->id,
                    'status' => Purchase::STATUS_PENDING,
                ];
                if ($order->buyer_transfer_confirmed_at === null) {
                    $updates['buyer_transfer_confirmed_at'] = now();
                    $updates['buyer_transfer_confirmed_by'] = $order->buyer_id;
                }
                $order->update($updates);
                Notification::create(
                    InAppNotificationPayload::orderTransferPaymentConfirmedForBuyer($order->fresh(['product']))
                );

                return response()->json([
                    'message' => __('orders.transfer_confirmed'),
                    'data' => $this->formatOrder(
                        $order->fresh(['product', 'buyer', 'seller', 'latestOrderPaymentRequest.values']),
                        $user->id,
                    ),
                ]);
            }

            $acceptCod = (bool) ($validated['accept_cod'] ?? false);
            unset($validated['accept_cod']);

            if ($acceptCod) {
                if ($order->payment_method !== 'cod') {
                    return response()->json(['message' => __('orders.cod_action_only')], 422);
                }
                if ($order->cod_seller_accepted_at !== null) {
                    return response()->json(['message' => __('orders.already_accepted')], 422);
                }
                if (!in_array($order->status, [Purchase::STATUS_COD_REQUESTED, Purchase::STATUS_PENDING], true)) {
                    return response()->json(['message' => __('orders.cannot_accept_status')], 422);
                }
                $order->update([
                    'cod_seller_accepted_at' => now(),
                    'status' => Purchase::STATUS_PENDING,
                ]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_pending'));

                return response()->json([
                    'message' => __('orders.cod_accepted'),
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
                    'message' => __('orders.accept_cod_before_shipment'),
                ], 422);
            }

            if ($trackingPayload !== []) {
                $order->update($trackingPayload);
            }

            if ($dispatchOutForDelivery) {
                if (! $this->sellerMayDispatch($order)) {
                    $message = __('orders.cannot_dispatch_status');
                    if ($order->isDirectTransfer() && ! $order->sellerConfirmedDirectTransfer()) {
                        $message = __('orders.confirm_transfer_before_shipment');
                    }

                    return response()->json(['message' => $message], 422);
                }
                if (! $dispatchLocationConfirmed) {
                    return response()->json([
                        'message' => __('orders.confirm_delivery_location_first'),
                    ], 422);
                }
                if ($order->shipping_lat === null || $order->shipping_lng === null) {
                    return response()->json([
                        'message' => __('orders.shipping_location_missing'),
                    ], 422);
                }
                $order->update(['status' => Purchase::STATUS_SHIPPED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_shipped'));
            } elseif (
                in_array($order->status, [Purchase::STATUS_AWAITING_PAYMENT], true)
                && $hasTrackingNumber
                && in_array($order->payment_method, ['escrow', 'balance'], true)
            ) {
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
                        'message' => __('orders.delivered_requires_shipped'),
                    ], 422);
                }
                if ($order->status !== Purchase::STATUS_SHIPPED) {
                    return response()->json([
                        'message' => __('orders.cannot_mark_delivered_status'),
                    ], 422);
                }
                $order->update(['status' => Purchase::STATUS_DELIVERED]);
                Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_delivered'));
            }

            return response()->json([
                'message' => $markDelivered
                    ? __('orders.marked_delivered')
                    : ($dispatchOutForDelivery ? __('orders.marked_out_for_delivery') : __('orders.order_updated')),
                'data' => $this->formatOrder(
                    $order->fresh(['product', 'buyer', 'seller', 'latestOrderPaymentRequest.values']),
                    $user->id,
                ),
            ]);
        }

        return response()->json(['message' => __('orders.invalid_action')], 422);
    }

    private function sellerMayDispatch(Purchase $order): bool
    {
        if (in_array($order->payment_method, ['escrow', 'balance'], true)) {
            return $order->status === Purchase::STATUS_AWAITING_PAYMENT;
        }

        if ($order->isDirectTransfer()) {
            return $order->status === Purchase::STATUS_PENDING
                && $order->sellerConfirmedDirectTransfer();
        }

        if ($order->payment_method === 'cod') {
            return $order->status === Purchase::STATUS_PENDING && $order->cod_seller_accepted_at !== null;
        }

        return false;
    }

    private function sellerMayAddTracking(Purchase $order): bool
    {
        if (in_array($order->payment_method, ['escrow', 'balance'], true)) {
            return in_array($order->status, [Purchase::STATUS_AWAITING_PAYMENT, Purchase::STATUS_SHIPPED], true);
        }

        if ($order->isDirectTransfer()) {
            return ($order->status === Purchase::STATUS_PENDING
                && $order->sellerConfirmedDirectTransfer())
                || $order->status === Purchase::STATUS_SHIPPED;
        }

        if ($order->payment_method === 'cod') {
            return ($order->status === Purchase::STATUS_PENDING && $order->cod_seller_accepted_at !== null)
                || $order->status === Purchase::STATUS_SHIPPED;
        }

        return false;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildOrderPaymentSummary(Purchase $order): ?array
    {
        $req = $order->relationLoaded('latestOrderPaymentRequest')
            ? $order->latestOrderPaymentRequest
            : $order->latestOrderPaymentRequest()->with('values')->first();

        if (! $req) {
            return null;
        }

        $fields = [];
        $receiptUrl = null;

        foreach ($req->values as $value) {
            $fileUrl = $value->file_url;
            $fields[] = [
                'field_key' => $value->field_key,
                'value_text' => $value->value_text,
                'file_url' => $fileUrl,
                'receipt_url' => $fileUrl,
            ];
            if ($fileUrl && ($receiptUrl === null || str_contains((string) $value->field_key, 'receipt'))) {
                $receiptUrl = $fileUrl;
            }
        }

        return [
            'id' => $req->id,
            'status' => $req->status,
            'fields' => $fields,
            'receipt_url' => $receiptUrl,
        ];
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
            return response()->json(['message' => __('orders.unauthorized')], 403);
        }

        if (!in_array($order->status, [
            Purchase::STATUS_PENDING,
            Purchase::STATUS_COD_REQUESTED,
            Purchase::STATUS_AWAITING_PAYMENT,
        ], true)) {
            return response()->json(['message' => __('orders.cancel_not_allowed')], 422);
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
            'message' => __('orders.cancelled'),
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
            return response()->json(['message' => __('orders.unauthorized')], 403);
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
            return response()->json(['message' => __('orders.dispute_not_allowed')], 422);
        }

        $order->update(['status' => Purchase::STATUS_DISPUTED]);
        Notification::create(InAppNotificationPayload::orderStatusForBuyer($order->fresh(['product']), 'order_disputed'));
        Notification::create(InAppNotificationPayload::orderStatusForSeller($order->fresh(['product']), 'order_disputed'));

        return response()->json([
            'message' => __('orders.dispute_opened'),
            'data' => $this->formatOrder($order->fresh(['product', 'buyer', 'seller']), $user->id),
        ]);
    }

    private function formatOrder(Purchase $order, int $currentUserId): array
    {
        $product = $order->product;
        $media = is_array($product?->media) ? $product->media : [];
        $imageUrl = $media['cover'] ?? $media['image_url'] ?? $product?->image_url ?? null;

        $locationEdit = app(OrderLocationEditService::class)->evaluate($order, $currentUserId);

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
            'seller_transfer_confirmed_at' => $order->seller_transfer_confirmed_at,
            'buyer_transfer_confirmed_at' => $order->buyer_transfer_confirmed_at,
            'order_payment' => $this->buildOrderPaymentSummary($order),
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
            'can_confirm_transfer_sent' => false,
            'can_confirm_direct_transfer' => $order->seller_id === $currentUserId
                && $order->isDirectTransfer()
                && in_array($order->status, [Purchase::STATUS_PENDING, Purchase::STATUS_AWAITING_PAYMENT], true)
                && $order->seller_transfer_confirmed_at === null
                && $order->hasTransferReceiptUploaded(),
            'can_contact_buyer' => $order->seller_id === $currentUserId
                && in_array($order->status, [
                    Purchase::STATUS_AWAITING_PAYMENT,
                    Purchase::STATUS_PENDING,
                    Purchase::STATUS_SHIPPED,
                ], true),
            'can_add_tracking' => $order->seller_id === $currentUserId
                && $this->sellerMayAddTracking($order),
            'can_dispatch_out_for_delivery' => $order->seller_id === $currentUserId
                && $this->sellerMayDispatch($order),
            'can_mark_delivered' => $order->seller_id === $currentUserId
                && $order->status === Purchase::STATUS_SHIPPED,
            'can_cancel' => ($order->buyer_id === $currentUserId || $order->seller_id === $currentUserId)
                && in_array($order->status, [
                    Purchase::STATUS_PENDING,
                    Purchase::STATUS_COD_REQUESTED,
                    Purchase::STATUS_AWAITING_PAYMENT,
                ], true),
            'can_edit_location' => $order->buyer_id === $currentUserId && $locationEdit['can_edit_location'],
            'location_edits_remaining' => $locationEdit['location_edits_remaining'],
            'location_edit_deadline_at' => $locationEdit['location_edit_deadline_at'],
            'can_review_seller' => $canReviewSeller,
        ];
    }
}
