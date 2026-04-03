<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Purchase::with(['product', 'buyer', 'seller'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'new') {
                $query->whereIn('status', [Purchase::STATUS_PENDING, Purchase::STATUS_PAID]);
            } elseif ($status === 'shipping') {
                $query->whereIn('status', [Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED]);
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
            'new' => Purchase::whereIn('status', [Purchase::STATUS_PENDING, Purchase::STATUS_PAID])->count(),
            'completed' => Purchase::where('status', Purchase::STATUS_COMPLETED)->count(),
            'incomplete' => Purchase::whereIn('status', [Purchase::STATUS_CANCELLED])->count(),
            'shipping' => Purchase::whereIn('status', [Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED])->count(),
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
        $purchase->load(['product.media', 'product.category', 'buyer', 'seller']);
        return response()->json(['data' => $this->formatOrder($purchase)]);
    }

    public function update(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:pending,paid,shipped,delivered,completed,cancelled'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'string', 'url', 'max:500'],
        ]);

        $purchase->update(array_filter($validated));

        return response()->json([
            'message' => __('Order updated.'),
            'data' => $this->formatOrder($purchase->fresh(['product', 'buyer', 'seller'])),
        ]);
    }

    private function formatOrder(Purchase $order): array
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
                'email' => $order->buyer->email,
                'phone' => $order->buyer->phone,
            ] : null,
            'seller' => $order->seller ? [
                'id' => $order->seller->id,
                'name' => $order->seller->name,
                'email' => $order->seller->email,
                'phone' => $order->seller->phone,
            ] : null,
        ];
    }
}
