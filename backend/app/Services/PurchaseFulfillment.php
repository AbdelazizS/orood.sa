<?php

namespace App\Services;

use App\Models\Balance;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PurchaseFulfillment
{
    /**
     * Mark purchase completed and release escrow to seller when applicable.
     */
    public static function complete(Purchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            $locked = Purchase::whereKey($purchase->getKey())->lockForUpdate()->firstOrFail();
            if ($locked->status === Purchase::STATUS_COMPLETED) {
                return;
            }

            $amount = (float) $locked->amount;
            $locked->update(['status' => Purchase::STATUS_COMPLETED]);

            $qty = max(1, (int) ($locked->quantity ?? 1));
            if ($locked->product_id) {
                $product = Product::whereKey($locked->product_id)->lockForUpdate()->first();
                if ($product) {
                    $product->increment('sold_count', $qty);
                }
            }

            if ($locked->payment_method !== 'escrow') {
                return;
            }

            $buyerBalance = Balance::getOrCreateForUser($locked->buyer_id);
            $buyerEscrow = (float) $buyerBalance->escrow;
            if ($buyerEscrow < $amount) {
                throw new RuntimeException('Buyer escrow balance mismatch for this order.');
            }
            $buyerBalance->decrement('escrow', $amount);

            $sellerBalance = Balance::getOrCreateForUser($locked->seller_id);
            $sellerBalance->increment('withdrawable', $amount);

            Transaction::create([
                'user_id' => $locked->seller_id,
                'type' => Transaction::TYPE_ORDER_RECEIPT,
                'amount' => $amount,
                'description' => __('Order completed — payout to seller').' #'.$locked->id,
                'purchase_id' => $locked->id,
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
        });
    }

    /**
     * Refund escrow hold to buyer available (cancel before completion).
     */
    public static function refundEscrowToBuyer(Purchase $purchase): void
    {
        if ($purchase->payment_method !== 'escrow') {
            return;
        }

        $amt = (float) $purchase->amount;
        $buyerBalance = Balance::getOrCreateForUser($purchase->buyer_id);
        if ((float) $buyerBalance->escrow < $amt) {
            throw new RuntimeException('Buyer escrow balance mismatch for refund.');
        }
        $buyerBalance->decrement('escrow', $amt);
        $buyerBalance->increment('available', $amt);
    }

    public static function cancelOrder(Purchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            $locked = Purchase::whereKey($purchase->getKey())->lockForUpdate()->firstOrFail();
            if ($locked->payment_method === 'escrow'
                && in_array($locked->status, [
                    Purchase::STATUS_AWAITING_PAYMENT,
                    Purchase::STATUS_SHIPPED,
                    Purchase::STATUS_DELIVERED,
                    Purchase::STATUS_DISPUTED,
                ], true)) {
                self::refundEscrowToBuyer($locked);
            }
            $locked->update(['status' => Purchase::STATUS_CANCELLED]);
        });
    }

    public static function buyerMayConfirmReceipt(Purchase $purchase): bool
    {
        if ($purchase->status === Purchase::STATUS_COMPLETED) {
            return false;
        }

        if ($purchase->payment_method === 'cod') {
            return in_array($purchase->status, [Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED], true);
        }

        // Escrow: funds stay held until the seller has shipped (or admin marked delivered).
        return in_array($purchase->status, [Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED], true);
    }

    public static function assertBuyerMayConfirmReceipt(Purchase $purchase): void
    {
        if (!self::buyerMayConfirmReceipt($purchase)) {
            throw new RuntimeException(__('Order cannot be confirmed in current status.'));
        }
    }

    /**
     * @return list<string>
     */
    public static function nextAdminStatuses(Purchase $purchase): array
    {
        $s = $purchase->status;

        if ($s === Purchase::STATUS_COMPLETED || $s === Purchase::STATUS_CANCELLED) {
            return [];
        }

        if ($s === Purchase::STATUS_DISPUTED) {
            return [
                Purchase::STATUS_PENDING,
                Purchase::STATUS_COD_REQUESTED,
                Purchase::STATUS_AWAITING_PAYMENT,
                Purchase::STATUS_SHIPPED,
                Purchase::STATUS_DELIVERED,
                Purchase::STATUS_COMPLETED,
                Purchase::STATUS_CANCELLED,
            ];
        }

        $common = [Purchase::STATUS_CANCELLED, Purchase::STATUS_DISPUTED];

        return match ($s) {
            Purchase::STATUS_COD_REQUESTED => array_merge(
                [Purchase::STATUS_PENDING, Purchase::STATUS_SHIPPED, Purchase::STATUS_CANCELLED],
                $common
            ),
            Purchase::STATUS_PENDING => array_values(array_unique(array_merge(
                $purchase->payment_method === 'cod'
                    ? [Purchase::STATUS_SHIPPED]
                    : [Purchase::STATUS_AWAITING_PAYMENT],
                $common
            ))),
            Purchase::STATUS_AWAITING_PAYMENT => array_merge(
                [Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED, Purchase::STATUS_COMPLETED],
                $common
            ),
            Purchase::STATUS_SHIPPED => array_merge(
                [Purchase::STATUS_DELIVERED, Purchase::STATUS_COMPLETED],
                $common
            ),
            Purchase::STATUS_DELIVERED => array_merge(
                [Purchase::STATUS_COMPLETED],
                $common
            ),
            default => $common,
        };
    }

    /**
     * Seller-fault disputes (planned automation): when rules mark the seller at fault after paid/shipped states,
     * reduce the seller's held {@see \App\Models\User::$financial_guarantee} and credit the buyer's available balance,
     * following the same ledger pattern as {@see \App\Http\Controllers\Api\Admin\AdminUserController::deductGuarantee()}.
     */

    public static function assertAdminMaySetStatus(Purchase $purchase, string $newStatus): void
    {
        if ($newStatus === $purchase->status) {
            return;
        }

        $allowed = self::nextAdminStatuses($purchase);
        if (!in_array($newStatus, $allowed, true)) {
            throw new RuntimeException(__('Invalid order status transition.'));
        }
    }
}
