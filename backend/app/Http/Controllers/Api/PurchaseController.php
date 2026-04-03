<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\Product;
use App\Models\Purchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    /**
     * Create a purchase (Buy Now) — escrow or COD.
     * For escrow: add amount to seller's escrow balance, status = paid.
     * For COD: status = pending until buyer confirms.
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if ($user->id === $product->user_id) {
            return response()->json(['message' => 'Cannot purchase your own product'], 403);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'in:escrow,cod'],
            'shipping_address' => ['nullable', 'string', 'max:500'],
            'buyer_phone' => ['nullable', 'string', 'max:20'],
            'buyer_email' => ['nullable', 'email'],
            'buyer_name' => ['nullable', 'string', 'max:255'],
        ]);

        $price = $product->price;
        if ($price === null || $price <= 0) {
            return response()->json(['message' => 'Product has no fixed price'], 422);
        }

        $paymentMethod = $validated['payment_method'];
        $status = $paymentMethod === 'escrow' ? Purchase::STATUS_PAID : Purchase::STATUS_PENDING;

        $purchase = DB::transaction(function () use ($product, $user, $validated, $price, $paymentMethod, $status) {
            $purchase = Purchase::create([
                'product_id' => $product->id,
                'buyer_id' => $user->id,
                'seller_id' => $product->user_id,
                'amount' => $price,
                'payment_method' => $paymentMethod,
                'status' => $status,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'buyer_phone' => $validated['buyer_phone'] ?? $user->phone,
                'buyer_email' => $validated['buyer_email'] ?? $user->email,
                'buyer_name' => $validated['buyer_name'] ?? $user->name,
            ]);

            if ($paymentMethod === 'escrow') {
                $sellerBalance = Balance::getOrCreateForUser($product->user_id);
                $sellerBalance->increment('escrow', $price);
            }

            $stats = $product->stats ?? [];
            $stats['purchases'] = ($stats['purchases'] ?? 0) + 1;
            $product->update(['stats' => $stats]);

            return $purchase;
        });

        return response()->json([
            'message' => 'Purchase created successfully',
            'data' => $purchase->load(['product', 'buyer', 'seller']),
        ], 201);
    }
}
