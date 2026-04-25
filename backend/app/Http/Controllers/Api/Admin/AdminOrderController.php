<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Services\PurchaseFulfillment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class AdminOrderController extends Controller
{
    private const NEW_ORDER_STATUSES = [
        Purchase::STATUS_PENDING,
        Purchase::STATUS_COD_REQUESTED,
        Purchase::STATUS_AWAITING_PAYMENT,
    ];

    private const SHIPPING_ORDER_STATUSES = [
        Purchase::STATUS_SHIPPED,
        Purchase::STATUS_DELIVERED,
    ];

    private const INCOMPLETE_ORDER_STATUSES = [
        Purchase::STATUS_CANCELLED,
        Purchase::STATUS_DISPUTED,
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Purchase::with(['product', 'buyer', 'seller'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'new') {
                $query->whereIn('status', self::NEW_ORDER_STATUSES);
            } elseif ($status === 'shipping') {
                $query->whereIn('status', self::SHIPPING_ORDER_STATUSES);
            } elseif ($status === 'incomplete') {
                $query->whereIn('status', self::INCOMPLETE_ORDER_STATUSES);
            } else {
                $query->where('status', $status);
            }
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($qry) use ($search) {
                $qry->whereHas('buyer', fn ($b) => $b->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                    ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                    ->orWhereHas('product', fn ($p) => $p->where('title', 'like', "%{$search}%"));
            });
        }

        $orders = $query->paginate($request->get('per_page', 20));

        $data = $orders->getCollection()->map(fn ($p) => $this->formatOrder($p));
        $orders->setCollection($data);

        $counts = [
            'new' => Purchase::whereIn('status', self::NEW_ORDER_STATUSES)->count(),
            'completed' => Purchase::where('status', Purchase::STATUS_COMPLETED)->count(),
            'incomplete' => Purchase::whereIn('status', self::INCOMPLETE_ORDER_STATUSES)->count(),
            'shipping' => Purchase::whereIn('status', self::SHIPPING_ORDER_STATUSES)->count(),
        ];

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
            'counts' => $counts,
        ]);
    }

    public function show(Purchase $purchase): JsonResponse
    {
        $purchase->load(['product.category', 'buyer', 'seller']);
        return response()->json(['data' => $this->formatOrder($purchase)]);
    }

    public function update(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:pending,cod_requested,awaiting_payment,shipped,delivered,completed,cancelled,disputed'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'string', 'url', 'max:500'],
        ]);

        $status = $validated['status'] ?? null;
        unset($validated['status']);

        if ($status !== null) {
            try {
                PurchaseFulfillment::assertAdminMaySetStatus($purchase, $status);
                if ($status === Purchase::STATUS_COMPLETED) {
                    PurchaseFulfillment::complete($purchase);
                } elseif ($status === Purchase::STATUS_CANCELLED) {
                    PurchaseFulfillment::cancelOrder($purchase);
                } else {
                    $purchase->update(['status' => $status]);
                }
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
        }

        if ($validated !== []) {
            $purchase->update(array_filter($validated));
        }

        return response()->json([
            'message' => __('Order updated.'),
            'data' => $this->formatOrder($purchase->fresh(['product', 'buyer', 'seller'])),
        ]);
    }

    /**
     * Cancel an order from admin with a mandatory reason (refunds escrow when applicable).
     */
    public function cancel(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        if (in_array($purchase->status, [Purchase::STATUS_COMPLETED, Purchase::STATUS_CANCELLED], true)) {
            return response()->json(['message' => __('This order cannot be cancelled.')], 422);
        }

        try {
            PurchaseFulfillment::cancelOrder($purchase->fresh());
            $purchase->refresh();
            $purchase->update([
                'admin_cancellation_reason' => $validated['reason'],
                'admin_cancelled_by' => $request->user()->id,
                'admin_cancelled_at' => now(),
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => __('Order cancelled.'),
            'data' => $this->formatOrder($purchase->fresh(['product', 'buyer', 'seller'])),
        ]);
    }

    /**
     * After dispute resolution: release payment to seller (same rules as buyer confirm for escrow).
     */
    public function forceComplete(Request $request, Purchase $purchase): JsonResponse
    {
        if ($purchase->status !== Purchase::STATUS_DISPUTED) {
            return response()->json(['message' => __('Force complete is only available for disputed orders.')], 422);
        }

        try {
            PurchaseFulfillment::complete($purchase->fresh());
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => __('Order completed and payout applied where applicable.'),
            'data' => $this->formatOrder($purchase->fresh(['product', 'buyer', 'seller'])),
        ]);
    }

    /**
     * Refund escrow to buyer and cancel the order (operations / finance).
     */
    public function forceRefund(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        if (in_array($purchase->status, [Purchase::STATUS_COMPLETED, Purchase::STATUS_CANCELLED], true)) {
            return response()->json(['message' => __('This order cannot be refunded.')], 422);
        }

        try {
            PurchaseFulfillment::cancelOrder($purchase->fresh());
            $purchase->refresh();
            $purchase->update([
                'admin_refund_reason' => $validated['reason'],
                'admin_cancelled_by' => $request->user()->id,
                'admin_cancelled_at' => now(),
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => __('Order cancelled and buyer refund applied where applicable.'),
            'data' => $this->formatOrder($purchase->fresh(['product', 'buyer', 'seller'])),
        ]);
    }

    private function formatOrder(Purchase $order): array
    {
        $product = $order->product;
        $media = is_array($product?->media) ? $product->media : [];
        $imageUrl = $media['cover'] ?? $media['image_url'] ?? $product?->image_url ?? null;

        $hasBidId = Schema::hasColumn('purchases', 'bid_id');

        return [
            'id' => $order->id,
            'order_number' => 'ORD-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
            'created_at' => $order->created_at,
            'status' => $order->status,
            'from_bid' => $hasBidId && $order->bid_id !== null,
            'bid_id' => $hasBidId ? $order->bid_id : null,
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
                'email' => $order->buyer->email,
                'phone' => $order->buyer->phone,
            ] : null,
            'seller' => $order->seller ? [
                'id' => $order->seller->id,
                'name' => $order->seller->name,
                'email' => $order->seller->email,
                'phone' => $order->seller->phone,
            ] : null,
            'admin_cancellation_reason' => $order->admin_cancellation_reason,
            'admin_cancelled_at' => $order->admin_cancelled_at,
            'admin_refund_reason' => $order->admin_refund_reason,
        ];
    }
}
