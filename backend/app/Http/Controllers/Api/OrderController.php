<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\Purchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $query = Purchase::with(['product.media', 'buyer', 'seller'])
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

        $order->load(['product.media', 'product.category', 'buyer', 'seller']);

        return response()->json([
            'data' => $this->formatOrder($order, $user->id),
        ]);
    }

    /**
     * Update order: seller adds tracking, buyer confirms receipt.
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

        // Seller updating tracking
        if ($order->seller_id === $user->id) {
            $validated = $request->validate([
                'tracking_number' => ['nullable', 'string', 'max:100'],
                'carrier' => ['nullable', 'string', 'max:100'],
                'tracking_url' => ['nullable', 'string', 'url', 'max:500'],
            ]);

            $order->update(array_filter($validated));

            if (in_array($order->status, [Purchase::STATUS_PAID])) {
                $order->update(['status' => Purchase::STATUS_SHIPPED]);
            }

            return response()->json([
                'message' => __('Tracking updated.'),
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

        if (!in_array($order->status, [Purchase::STATUS_PENDING, Purchase::STATUS_PAID])) {
            return response()->json(['message' => 'Order cannot be cancelled in current status'], 422);
        }

        if ($order->status === Purchase::STATUS_PAID) {
            $balance = Balance::getOrCreateForUser($order->buyer_id);
            $balance->increment('available', $order->amount);
            $sellerBalance = Balance::getOrCreateForUser($order->seller_id);
            $sellerBalance->decrement('escrow', $order->amount);
        }

        $order->update(['status' => Purchase::STATUS_CANCELLED]);

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

        $order->update(['status' => 'disputed']);

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

        return [
            'id' => $order->id,
            'order_number' => 'ORD-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
            'created_at' => $order->created_at,
            'status' => $order->status,
            'payment_method' => $order->payment_method,
            'amount' => (float) $order->amount,
            'tracking_number' => $order->tracking_number,
            'carrier' => $order->carrier,
            'tracking_url' => $order->tracking_url,
            'invoice_url' => $order->invoice_url,
            'shipping_address' => $order->shipping_address,
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
                'phone' => $order->seller->phone,
            ] : null,
            'is_buyer' => $order->buyer_id === $currentUserId,
            'is_seller' => $order->seller_id === $currentUserId,
            'can_confirm_receipt' => $order->buyer_id === $currentUserId
                && in_array($order->status, [Purchase::STATUS_PAID, Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED])
                && $order->status !== Purchase::STATUS_COMPLETED,
            'can_add_tracking' => $order->seller_id === $currentUserId
                && in_array($order->status, [Purchase::STATUS_PAID, Purchase::STATUS_SHIPPED]),
        ];
    }
}
