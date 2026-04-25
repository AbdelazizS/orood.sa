<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bid;
use App\Models\Notification;
use App\Models\Product;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BidAcceptController extends Controller
{
    /**
     * Accept a bid without auto-creating an order.
     */
    public function __invoke(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! in_array($bid->status, [Bid::STATUS_PENDING, Bid::STATUS_ACCEPTED], true)) {
            return response()->json(['message' => 'Bid already processed'], 422);
        }

        try {
            DB::transaction(function () use ($product, $bid) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            /** @var Bid $lockedBid */
            $lockedBid = Bid::query()->whereKey($bid->id)->lockForUpdate()->firstOrFail();
            if ($lockedBid->status !== Bid::STATUS_PENDING && $lockedBid->status !== Bid::STATUS_ACCEPTED) {
                throw new \RuntimeException('Bid already processed');
            }

            $lockedBid->update([
                'status' => Bid::STATUS_ACCEPTED,
                'accepted_at' => now(),
                'accepted_by' => $lockedProduct->user_id,
            ]);
            $losingBids = $lockedProduct->bids()
                ->where('id', '!=', $lockedBid->id)
                ->where('status', Bid::STATUS_PENDING)
                ->get(['id', 'user_id']);
            $lockedProduct->bids()->whereIn('id', $losingBids->pluck('id'))->update([
                'status' => Bid::STATUS_REJECTED,
                'rejected_at' => now(),
            ]);
            $lockedProduct->update([
                'current_bid_user_id' => $lockedBid->user_id,
                'status' => 'sold',
            ]);
            $lockedProduct->refreshBidStats();

            Notification::create(
                InAppNotificationPayload::bidAcceptedForBuyer($lockedProduct, (int) $lockedBid->id, (int) $lockedBid->user_id)
            );

            foreach ($losingBids as $losingBid) {
                Notification::create(
                    InAppNotificationPayload::bidRejectedForBuyer($lockedProduct, (int) $losingBid->id, (int) $losingBid->user_id)
                );
            }
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Bid accepted. Buyer must complete order.',
            'data' => [
                'bid_id' => $bid->id,
                'product_id' => $product->id,
                'status' => Bid::STATUS_ACCEPTED,
            ],
        ]);
    }
}
