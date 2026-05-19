<?php

namespace App\Services\Finance;

use App\Models\ChargeRequest;
use App\Models\FinancialRequest;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WithdrawalRequest;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class FinancialActivityService
{
    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function timeline(User $user, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $items = collect();

        $frQuery = FinancialRequest::query()
            ->where('user_id', $user->id)
            ->with(['values', 'paymentMethod']);

        if ($status = $filters['status'] ?? null) {
            $frQuery->where('status', $status);
        }
        if ($type = $filters['type'] ?? null) {
            $frQuery->where('type', $this->mapFilterTypeToFinancial($type));
        }

        foreach ($frQuery->latest('id')->limit(100)->get() as $fr) {
            $items->push($this->fromFinancialRequest($fr));
        }

        foreach (ChargeRequest::where('user_id', $user->id)->latest('id')->limit(50)->get() as $cr) {
            if ($items->contains(fn ($i) => ($i['meta']['legacy_charge_request_id'] ?? null) === $cr->id)) {
                continue;
            }
            $items->push($this->fromChargeRequest($cr));
        }

        foreach (WithdrawalRequest::where('user_id', $user->id)->latest('id')->limit(50)->get() as $wr) {
            if ($items->contains(fn ($i) => ($i['meta']['legacy_withdrawal_request_id'] ?? null) === $wr->id)) {
                continue;
            }
            $items->push($this->fromWithdrawalRequest($wr));
        }

        foreach (Transaction::where('user_id', $user->id)->latest('id')->limit(30)->get() as $tx) {
            $items->push($this->fromTransaction($tx));
        }

        $sorted = $items->sortByDesc('created_at')->values();

        if ($filterType = $filters['activity_type'] ?? null) {
            $sorted = $sorted->filter(fn ($i) => $i['type'] === $filterType)->values();
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $slice = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

        return new \Illuminate\Pagination\LengthAwarePaginator(
            $slice,
            $sorted->count(),
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()],
        );
    }

    protected function mapFilterTypeToFinancial(string $type): string
    {
        return match ($type) {
            'recharge_pending', 'recharge_approved', 'recharge_rejected' => FinancialRequest::TYPE_WALLET_CHARGE,
            'withdraw_pending', 'withdraw_approved', 'withdraw_rejected' => FinancialRequest::TYPE_WALLET_WITHDRAW,
            default => $type,
        };
    }

    /**
     * @return array<string, mixed>
     */
    protected function fromFinancialRequest(FinancialRequest $fr): array
    {
        $prefix = $fr->type === FinancialRequest::TYPE_WALLET_WITHDRAW ? 'withdraw' : 'recharge';
        $statusKey = match ($fr->status) {
            FinancialRequest::STATUS_COMPLETED, FinancialRequest::STATUS_APPROVED => "{$prefix}_approved",
            FinancialRequest::STATUS_REJECTED => "{$prefix}_rejected",
            default => "{$prefix}_pending",
        };

        return [
            'id' => 'fr-'.$fr->id,
            'source' => 'financial_request',
            'type' => $statusKey,
            'status' => $fr->status,
            'amount' => (float) ($fr->amount ?? 0),
            'currency' => $fr->currency ?? 'SAR',
            'title_ar' => $fr->type === FinancialRequest::TYPE_WALLET_CHARGE ? 'طلب شحن' : 'طلب سحب',
            'title_en' => $fr->type === FinancialRequest::TYPE_WALLET_CHARGE ? 'Recharge request' : 'Withdrawal request',
            'created_at' => ($fr->submitted_at ?? $fr->created_at)?->toIso8601String(),
            'meta' => [
                'financial_request_id' => $fr->id,
                'legacy_charge_request_id' => $fr->legacy_charge_request_id,
                'legacy_withdrawal_request_id' => $fr->legacy_withdrawal_request_id,
                'rejection_reason' => $fr->rejection_reason,
                'values' => $fr->values,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function fromChargeRequest(ChargeRequest $cr): array
    {
        $type = match ($cr->status) {
            ChargeRequest::STATUS_APPROVED => 'recharge_approved',
            ChargeRequest::STATUS_REJECTED => 'recharge_rejected',
            default => 'recharge_pending',
        };

        return [
            'id' => 'cr-'.$cr->id,
            'source' => 'charge_request',
            'type' => $type,
            'status' => $cr->status,
            'amount' => (float) $cr->amount,
            'currency' => 'SAR',
            'title_ar' => 'طلب شحن',
            'title_en' => 'Recharge request',
            'created_at' => ($cr->submitted_at ?? $cr->created_at)?->toIso8601String(),
            'meta' => ['legacy_charge_request_id' => $cr->id, 'transfer_reference' => $cr->transfer_reference],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function fromWithdrawalRequest(WithdrawalRequest $wr): array
    {
        $type = match ($wr->status) {
            WithdrawalRequest::STATUS_APPROVED => 'withdraw_approved',
            WithdrawalRequest::STATUS_REJECTED => 'withdraw_rejected',
            default => 'withdraw_pending',
        };

        return [
            'id' => 'wr-'.$wr->id,
            'source' => 'withdrawal_request',
            'type' => $type,
            'status' => $wr->status,
            'amount' => (float) $wr->amount,
            'currency' => 'SAR',
            'title_ar' => 'طلب سحب',
            'title_en' => 'Withdrawal request',
            'created_at' => $wr->created_at?->toIso8601String(),
            'meta' => ['legacy_withdrawal_request_id' => $wr->id],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function fromTransaction(Transaction $tx): array
    {
        $type = (float) $tx->amount >= 0 ? 'wallet_increase' : 'wallet_decrease';

        return [
            'id' => 'tx-'.$tx->id,
            'source' => 'transaction',
            'type' => $type,
            'status' => $tx->status ?? 'completed',
            'amount' => abs((float) $tx->amount),
            'currency' => 'SAR',
            'title_ar' => $tx->description ?? 'حركة محفظة',
            'title_en' => $tx->description ?? 'Wallet movement',
            'created_at' => ($tx->completed_at ?? $tx->created_at)?->toIso8601String(),
            'meta' => ['transaction_id' => $tx->id],
        ];
    }
}
