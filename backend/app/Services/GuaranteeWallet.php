<?php

namespace App\Services;

use App\Models\Balance;
use App\Models\Guarantee;
use App\Models\Purchase;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class GuaranteeWallet
{
    public static function applyDeposit(User $user, float $amount): void
    {
        $balance = Balance::getOrCreateForUser($user->id);
        if ((float) $balance->available < $amount) {
            throw new \InvalidArgumentException(__('Insufficient balance.'));
        }

        DB::transaction(function () use ($user, $balance, $amount) {
            Guarantee::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'status' => Guarantee::STATUS_ACTIVE,
            ]);
            $user->increment('financial_guarantee', $amount);
            $balance->decrement('available', $amount);
            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_DEPOSIT,
                'amount' => -$amount,
                'description' => __('Deposit to financial guarantee'),
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
        });
    }

    /**
     * Refund entire held guarantee to user's available balance.
     *
     * @throws \InvalidArgumentException
     */
    public static function applyRefund(User $user): void
    {
        $amount = (float) ($user->financial_guarantee ?? 0);

        if ($amount <= 0) {
            throw new \InvalidArgumentException(__('No guarantee to refund.'));
        }

        $pendingAsSeller = Purchase::where('seller_id', $user->id)
            ->whereIn('status', ['pending', 'cod_requested', 'awaiting_payment', 'shipped', 'delivered'])
            ->exists();

        if ($pendingAsSeller) {
            throw new \InvalidArgumentException(__('Cannot refund guarantee while you have pending orders.'));
        }

        DB::transaction(function () use ($user, $amount) {
            Guarantee::where('user_id', $user->id)
                ->where('status', Guarantee::STATUS_ACTIVE)
                ->update(['status' => Guarantee::STATUS_REFUNDED, 'refunded_at' => now()]);

            $user->update(['financial_guarantee' => 0]);

            $balance = Balance::getOrCreateForUser($user->id);
            $balance->increment('available', $amount);

            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_WITHDRAWAL,
                'amount' => $amount,
                'description' => __('Guarantee refunded to balance'),
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
        });
    }
}
