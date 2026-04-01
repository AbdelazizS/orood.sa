<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bid;
use App\Models\Balance;
use App\Models\Comment;
use App\Models\Purchase;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BidAcceptController extends Controller
{
    /**
     * Accept a bid and create an order (purchase) with escrow.
     */
    public function __invoke(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if ($bid->status !== 'PENDING') {
            return response()->json(['message' => 'Bid already processed'], 422);
        }

        $buyerBalance = Balance::getOrCreateForUser($bid->user_id);
        $amount = (float) $bid->amount;
        $feeRate = 0.0275;
        $fee = round($amount * $feeRate, 2);
        $total = $amount + $fee;

        if ((float) $buyerBalance->available < $total) {
            return response()->json(['message' => 'Insufficient balance'], 422);
        }

        DB::transaction(function () use ($product, $bid, $amount, $fee, $total) {
            $bid->update([
                'status' => \App\Models\Bid::STATUS_ACCEPTED,
                'accepted_at' => now(),
                'accepted_by' => $product->user_id,
            ]);
            $product->bids()->where('id', '!=', $bid->id)->update([
                'status' => \App\Models\Bid::STATUS_REJECTED,
                'rejected_at' => now(),
            ]);
            $product->update([
                'current_bid_user_id' => $bid->user_id,
                'status' => 'sold',
            ]);
            $product->refreshBidStats();

            $buyerBalance = Balance::getOrCreateForUser($bid->user_id);
            $buyerBalance->decrement('available', $total);
            $buyerBalance->increment('escrow', $amount);

            $buyer = $bid->user;
            Purchase::create([
                'product_id' => $product->id,
                'buyer_id' => $bid->user_id,
                'seller_id' => $product->user_id,
                'amount' => $amount,
                'payment_method' => 'balance',
                'status' => Purchase::STATUS_PAID,
                'buyer_phone' => $buyer->phone ?? null,
                'buyer_name' => $buyer->name,
            ]);
        });

        return response()->json([
            'message' => 'Bid accepted. Order created.',
            'data' => Purchase::where('product_id', $product->id)
                ->where('buyer_id', $bid->user_id)
                ->latest()
                ->first()
                ->load(['product', 'buyer', 'seller']),
        ], 201);
    }
}
