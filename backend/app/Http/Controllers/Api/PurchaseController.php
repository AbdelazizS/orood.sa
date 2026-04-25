<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\GroupBuyReservation;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Transaction;
use App\Services\Notifications\PurchaseOrderNotifications;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    /**
     * Create a purchase (Buy Now) — escrow or COD.
     * Escrow: deduct buyer available, hold in buyer escrow until receipt confirmation; seller is credited on confirm.
     * COD: pending until delivery/payment; no balance movement on create.
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if ($user->id === $product->user_id) {
            return response()->json(['message' => 'Cannot purchase your own product'], 403);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'in:escrow,cod'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:999'],
            'shipping_address' => ['nullable', 'string', 'max:500'],
            'shipping_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'shipping_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'buyer_note' => ['nullable', 'string', 'max:2000'],
            'buyer_phone' => ['nullable', 'string', 'max:20'],
            'buyer_email' => ['nullable', 'email'],
            'buyer_name' => ['nullable', 'string', 'max:255'],
        ]);

        $price = (float) $product->price;
        if ($price <= 0) {
            return response()->json(['message' => 'Product has no fixed price'], 422);
        }

        $quantity = (int) ($validated['quantity'] ?? 1);
        $totalAmount = round($price * $quantity, 2);
        if ($totalAmount <= 0) {
            return response()->json(['message' => __('Invalid order total.')], 422);
        }

        $paymentMethod = $validated['payment_method'];

        if ($paymentMethod === 'cod' && !($product->allow_cod ?? true)) {
            return response()->json([
                'message' => __('Cash on delivery is not available for this listing.'),
            ], 422);
        }

        $status = $paymentMethod === 'escrow'
            ? Purchase::STATUS_AWAITING_PAYMENT
            : Purchase::STATUS_COD_REQUESTED;

        try {
            $purchase = DB::transaction(function () use ($product, $user, $validated, $totalAmount, $quantity, $paymentMethod, $status) {
                $purchase = Purchase::create([
                    'product_id' => $product->id,
                    'buyer_id' => $user->id,
                    'seller_id' => $product->user_id,
                    'amount' => $totalAmount,
                    'quantity' => $quantity,
                    'payment_method' => $paymentMethod,
                    'status' => $status,
                    'shipping_address' => $validated['shipping_address'] ?? null,
                    'shipping_lat' => $validated['shipping_lat'] ?? null,
                    'shipping_lng' => $validated['shipping_lng'] ?? null,
                    'buyer_note' => $validated['buyer_note'] ?? null,
                    'buyer_phone' => $validated['buyer_phone'] ?? $user->phone,
                    'buyer_email' => $validated['buyer_email'] ?? $user->email,
                    'buyer_name' => $validated['buyer_name'] ?? $user->name,
                ]);

                if ($paymentMethod === 'escrow') {
                    $buyerBalance = Balance::getOrCreateForUser($user->id);
                    if ((float) $buyerBalance->available < $totalAmount) {
                        throw new \RuntimeException('INSUFFICIENT_BALANCE');
                    }

                    $buyerBalance->decrement('available', $totalAmount);
                    $buyerBalance->increment('escrow', $totalAmount);

                    Transaction::create([
                        'user_id' => $user->id,
                        'type' => Transaction::TYPE_ORDER_PAYMENT,
                        'amount' => -$totalAmount,
                        'description' => __('Escrow hold for purchase').' #'.$purchase->id,
                        'purchase_id' => $purchase->id,
                        'status' => Transaction::STATUS_COMPLETED,
                        'completed_at' => now(),
                    ]);
                }

                $stats = $product->stats ?? [];
                $stats['purchases'] = ($stats['purchases'] ?? 0) + 1;
                $product->update(['stats' => $stats]);

                return $purchase;
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_BALANCE') {
                return response()->json([
                    'message' => __('Insufficient available balance. Please charge your wallet first.'),
                ], 422);
            }
            throw $e;
        }

        app(PurchaseOrderNotifications::class)->notifySellerOfNewPurchase(
            $purchase->fresh(['product', 'buyer', 'seller'])
        );

        return response()->json([
            'message' => 'Purchase created successfully',
            'data' => $purchase->load(['product', 'buyer', 'seller']),
        ], 201);
    }

    public function wholesaleCheckout(Request $request, GroupBuyReservation $reservation): JsonResponse
    {
        $user = $request->user();
        if ((int) $reservation->user_id !== (int) $user->id) {
            return response()->json(['message' => __('wholesale.reservation_not_found')], 404);
        }
        if ($reservation->status !== GroupBuyReservation::STATUS_PAYMENT_PENDING) {
            return response()->json(['message' => __('wholesale.checkout_not_eligible')], 422);
        }
        if ($reservation->purchase_id) {
            return response()->json(['message' => __('wholesale.already_purchased')], 422);
        }
        if ($reservation->checkout_expires_at && $reservation->checkout_expires_at->isPast()) {
            $reservation->update(['status' => GroupBuyReservation::STATUS_EXPIRED]);

            return response()->json(['message' => __('wholesale.checkout_window_expired')], 422);
        }

        $product = $reservation->product()->first();
        if (! $product || ! $product->is_wholesale) {
            return response()->json(['message' => __('wholesale.product_not_available')], 422);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'in:escrow,cod'],
            'shipping_address' => ['nullable', 'string', 'max:500'],
            'shipping_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'shipping_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'buyer_note' => ['nullable', 'string', 'max:2000'],
            'buyer_phone' => ['nullable', 'string', 'max:20'],
            'buyer_email' => ['nullable', 'email'],
            'buyer_name' => ['nullable', 'string', 'max:255'],
        ]);

        $quantity = max(1, (int) $reservation->quantity);
        $unitPrice = (float) ($reservation->price_snapshot ?? $product->wholesale_price ?? $product->price ?? 0);
        if ($unitPrice <= 0) {
            return response()->json(['message' => __('wholesale.invalid_wholesale_price')], 422);
        }
        $totalAmount = round($unitPrice * $quantity, 2);
        $paymentMethod = $validated['payment_method'];
        if ($paymentMethod === 'cod' && ! ($product->allow_cod ?? true)) {
            return response()->json(['message' => __('Cash on delivery is not available for this listing.')], 422);
        }
        $status = $paymentMethod === 'escrow' ? Purchase::STATUS_AWAITING_PAYMENT : Purchase::STATUS_COD_REQUESTED;

        try {
            $purchase = DB::transaction(function () use ($reservation, $product, $user, $validated, $quantity, $unitPrice, $totalAmount, $paymentMethod, $status) {
                $lockedReservation = GroupBuyReservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();
                if ($lockedReservation->status !== GroupBuyReservation::STATUS_PAYMENT_PENDING || $lockedReservation->purchase_id) {
                    throw new \RuntimeException('RESERVATION_NOT_ELIGIBLE');
                }

                $purchase = Purchase::create([
                    'product_id' => $product->id,
                    'buyer_id' => $user->id,
                    'seller_id' => $product->user_id,
                    'group_buy_reservation_id' => $lockedReservation->id,
                    'amount' => $totalAmount,
                    'wholesale_unit_price' => $unitPrice,
                    'wholesale_discount_percent' => $product->discount_percent,
                    'wholesale_checkout_deadline_at' => $lockedReservation->checkout_expires_at,
                    'wholesale_campaign_completed_at' => $lockedReservation->checkout_expires_at ? $lockedReservation->checkout_expires_at->copy()->subMinutes(\App\Services\WholesaleReservationLifecycleService::CHECKOUT_WINDOW_MINUTES) : now(),
                    'quantity' => $quantity,
                    'payment_method' => $paymentMethod,
                    'status' => $status,
                    'shipping_address' => $validated['shipping_address'] ?? null,
                    'shipping_lat' => $validated['shipping_lat'] ?? null,
                    'shipping_lng' => $validated['shipping_lng'] ?? null,
                    'buyer_note' => $validated['buyer_note'] ?? null,
                    'buyer_phone' => $validated['buyer_phone'] ?? $user->phone,
                    'buyer_email' => $validated['buyer_email'] ?? $user->email,
                    'buyer_name' => $validated['buyer_name'] ?? $user->name,
                ]);

                if ($paymentMethod === 'escrow') {
                    $buyerBalance = Balance::getOrCreateForUser($user->id);
                    if ((float) $buyerBalance->available < $totalAmount) {
                        throw new \RuntimeException('INSUFFICIENT_BALANCE');
                    }
                    $buyerBalance->decrement('available', $totalAmount);
                    $buyerBalance->increment('escrow', $totalAmount);

                    Transaction::create([
                        'user_id' => $user->id,
                        'type' => Transaction::TYPE_ORDER_PAYMENT,
                        'amount' => -$totalAmount,
                        'description' => __('Escrow hold for wholesale purchase').' #'.$purchase->id,
                        'purchase_id' => $purchase->id,
                        'status' => Transaction::STATUS_COMPLETED,
                        'completed_at' => now(),
                    ]);
                }

                $lockedReservation->update([
                    'status' => GroupBuyReservation::STATUS_PURCHASED,
                    'purchase_id' => $purchase->id,
                    'purchased_at' => now(),
                ]);

                return $purchase;
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_BALANCE') {
                return response()->json(['message' => __('Insufficient available balance. Please charge your wallet first.')], 422);
            }
            if ($e->getMessage() === 'RESERVATION_NOT_ELIGIBLE') {
                return response()->json(['message' => __('wholesale.checkout_not_eligible')], 422);
            }
            throw $e;
        }

        app(PurchaseOrderNotifications::class)->notifySellerOfNewPurchase(
            $purchase->fresh(['product', 'buyer', 'seller', 'groupBuyReservation'])
        );

        return response()->json([
            'message' => __('wholesale.checkout_success'),
            'data' => $purchase->load(['product', 'buyer', 'seller']),
        ], 201);
    }
}
