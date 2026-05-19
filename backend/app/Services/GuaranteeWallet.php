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
    public static function memberAvailableBalance(User $user): float
    {
        return (float) Balance::getOrCreateForUser($user->id)->available;
    }

    /**
     * Credit guarantee from the member's platform wallet (deducts available balance).
     *
     * @throws \InvalidArgumentException when wallet balance is insufficient
     */
    public static function applyDepositFromPlatformWallet(User $user, float $amount): void
    {
        $balance = Balance::getOrCreateForUser($user->id);
        if ((float) $balance->available < $amount) {
            throw new \InvalidArgumentException(__('wallet.insufficient_balance_for_guarantee'));
        }

        DB::transaction(function () use ($user, $balance, $amount) {
            self::createGuaranteeRecord($user, $amount);
            $balance->decrement('available', $amount);
            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_DEPOSIT,
                'amount' => -$amount,
                'description' => __('wallet.guarantee_deposit_from_wallet'),
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
                'metadata' => ['funding_source' => 'platform_wallet'],
            ]);
        });
    }

    /**
     * Credit guarantee when admin confirmed payment outside the platform wallet
     * (bank transfer, cash, etc. after contacting the member).
     */
    public static function applyDepositFromExternal(
        User $user,
        float $amount,
        ?string $approvalNote = null,
        ?int $processedBy = null,
    ): void {
        DB::transaction(function () use ($user, $amount, $approvalNote, $processedBy) {
            self::createGuaranteeRecord($user, $amount);
            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_DEPOSIT,
                'amount' => $amount,
                'description' => __('wallet.guarantee_deposit_external'),
                'status' => Transaction::STATUS_COMPLETED,
                'completed_at' => now(),
                'metadata' => array_filter([
                    'funding_source' => 'external',
                    'approval_note' => $approvalNote,
                    'processed_by' => $processedBy,
                ]),
            ]);
        });
    }

    /** @deprecated Use applyDepositFromPlatformWallet */
    public static function applyDeposit(User $user, float $amount): void
    {
        self::applyDepositFromPlatformWallet($user, $amount);
    }

    private static function createGuaranteeRecord(User $user, float $amount): void
    {
        Guarantee::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'status' => Guarantee::STATUS_ACTIVE,
        ]);
        $user->increment('financial_guarantee', $amount);
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
