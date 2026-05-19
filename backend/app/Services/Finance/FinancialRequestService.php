<?php

namespace App\Services\Finance;

use App\Models\Balance;
use App\Models\ChargeRequest;
use App\Models\FinancialRequest;
use App\Models\FinancialRequestEvent;
use App\Models\FinancialRequestValue;
use App\Models\GuaranteeRequest;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodField;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WithdrawalRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialRequestService
{
    public function __construct(
        private readonly DynamicFormValidator $validator,
        private readonly PaymentMethodService $paymentMethodService,
        private readonly FinancialNotificationDispatcher $notifications,
    ) {}

    /**
     * @param  Collection<int, PaymentMethodField>  $fields
     * @param  array<string, mixed>  $input
     */
    public function submit(
        User $user,
        string $type,
        Collection $fields,
        array $input,
        ?float $amount = null,
        ?int $paymentMethodId = null,
        ?Model $related = null,
        ?string $idempotencyKey = null,
    ): FinancialRequest {
        $method = $paymentMethodId
            ? PaymentMethod::query()->find($paymentMethodId)
            : null;

        $validated = $this->validator->validate($fields, $input, $method);

        if ($idempotencyKey) {
            $existing = FinancialRequest::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing;
            }
        }

        return DB::transaction(function () use ($user, $type, $validated, $amount, $paymentMethodId, $related, $idempotencyKey) {
            $request = FinancialRequest::create([
                'type' => $type,
                'user_id' => $user->id,
                'related_type' => $related ? $related->getMorphClass() : null,
                'related_id' => $related?->getKey(),
                'amount' => $amount ?? (isset($validated['amount']) ? (float) $validated['amount'] : null),
                'status' => FinancialRequest::STATUS_PENDING,
                'idempotency_key' => $idempotencyKey,
                'payment_method_id' => $paymentMethodId,
                'submitted_at' => now(),
            ]);

            foreach ($validated as $key => $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                FinancialRequestValue::create([
                    'financial_request_id' => $request->id,
                    'field_key' => $key,
                    'value_text' => is_scalar($value) ? (string) $value : null,
                    'value_json' => is_array($value) ? $value : null,
                    'file_url' => in_array($key, ['receipt_url', 'file_url'], true) ? (string) $value : null,
                ]);
            }

            $this->recordEvent($request, $user->id, 'submitted', $validated);
            $this->notifications->requestSubmitted($request);

            return $request->load('values');
        });
    }

    public function approve(FinancialRequest $request, User $admin, string $approvalNote): FinancialRequest
    {
        return DB::transaction(function () use ($request, $admin, $approvalNote) {
            $request->update([
                'status' => FinancialRequest::STATUS_APPROVED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'admin_internal_note' => $approvalNote,
            ]);

            if ($request->type === FinancialRequest::TYPE_WALLET_CHARGE && $request->amount > 0) {
                $this->creditWallet($request->user_id, (float) $request->amount, $request);
            }

            if ($request->type === FinancialRequest::TYPE_WALLET_WITHDRAW && $request->amount > 0) {
                $this->debitWithdrawable($request->user_id, (float) $request->amount, $request);
            }

            $request->update([
                'status' => FinancialRequest::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            $this->syncLegacyOnApprove($request, $admin);
            $this->recordEvent($request, $admin->id, 'approved', ['approval_note' => $approvalNote]);
            $this->notifications->requestApproved($request);

            return $request->fresh('values');
        });
    }

    public function reject(FinancialRequest $request, User $admin, string $reason): FinancialRequest
    {
        $request->update([
            'status' => FinancialRequest::STATUS_REJECTED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason,
        ]);

        $this->syncLegacyOnReject($request, $admin, $reason);
        $this->recordEvent($request, $admin->id, 'rejected', ['reason' => $reason]);
        $this->notifications->requestRejected($request);

        return $request->fresh();
    }

    /**
     * Approve via linked legacy charge/withdraw row without double-crediting wallet.
     */
    public function approveFromLegacyCharge(ChargeRequest $charge, User $admin): ?FinancialRequest
    {
        $request = FinancialRequest::query()
            ->where('legacy_charge_request_id', $charge->id)
            ->first();

        if (! $request || $request->status === FinancialRequest::STATUS_COMPLETED) {
            return $request;
        }

        return $this->approve($request, $admin, __('finance.legacy_charge_approval_note'));
    }

    public function approveFromLegacyWithdrawal(WithdrawalRequest $withdrawal, User $admin): ?FinancialRequest
    {
        $request = FinancialRequest::query()
            ->where('legacy_withdrawal_request_id', $withdrawal->id)
            ->first();

        if (! $request || $request->status === FinancialRequest::STATUS_COMPLETED) {
            return $request;
        }

        return $this->approve($request, $admin, __('finance.legacy_withdrawal_approval_note'));
    }

    protected function syncLegacyOnApprove(FinancialRequest $request, User $admin): void
    {
        if ($request->legacy_charge_request_id) {
            ChargeRequest::query()
                ->where('id', $request->legacy_charge_request_id)
                ->where('status', ChargeRequest::STATUS_PENDING)
                ->update([
                    'status' => ChargeRequest::STATUS_APPROVED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                ]);
        }

        if ($request->legacy_withdrawal_request_id) {
            WithdrawalRequest::query()
                ->where('id', $request->legacy_withdrawal_request_id)
                ->where('status', WithdrawalRequest::STATUS_PENDING)
                ->update([
                    'status' => WithdrawalRequest::STATUS_APPROVED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                ]);
        }
    }

    protected function syncLegacyOnReject(FinancialRequest $request, User $admin, string $reason): void
    {
        if ($request->legacy_charge_request_id) {
            ChargeRequest::query()
                ->where('id', $request->legacy_charge_request_id)
                ->where('status', ChargeRequest::STATUS_PENDING)
                ->update([
                    'status' => ChargeRequest::STATUS_REJECTED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'rejection_reason' => $reason,
                ]);
        }

        if ($request->legacy_withdrawal_request_id) {
            WithdrawalRequest::query()
                ->where('id', $request->legacy_withdrawal_request_id)
                ->where('status', WithdrawalRequest::STATUS_PENDING)
                ->update([
                    'status' => WithdrawalRequest::STATUS_REJECTED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'rejection_reason' => $reason,
                ]);
        }
    }

    public function syncFromChargeRequest(ChargeRequest $charge): FinancialRequest
    {
        return FinancialRequest::updateOrCreate(
            ['legacy_charge_request_id' => $charge->id],
            [
                'type' => FinancialRequest::TYPE_WALLET_CHARGE,
                'user_id' => $charge->user_id,
                'amount' => $charge->amount,
                'status' => $charge->status === ChargeRequest::STATUS_APPROVED
                    ? FinancialRequest::STATUS_COMPLETED
                    : ($charge->status === ChargeRequest::STATUS_REJECTED
                        ? FinancialRequest::STATUS_REJECTED
                        : FinancialRequest::STATUS_PENDING),
                'submitted_at' => $charge->submitted_at ?? $charge->created_at,
                'reviewed_at' => $charge->reviewed_at,
                'reviewed_by' => $charge->reviewed_by,
                'rejection_reason' => $charge->rejection_reason,
                'idempotency_key' => $charge->idempotency_key,
            ]
        );
    }

    protected function creditWallet(int $userId, float $amount, FinancialRequest $request): void
    {
        $balance = Balance::getOrCreateForUser($userId);
        $before = (float) $balance->available;
        $balance->increment('available', $amount);
        $balance->increment('withdrawable', $amount);

        Transaction::create([
            'user_id' => $userId,
            'type' => Transaction::TYPE_DEPOSIT,
            'amount' => $amount,
            'status' => Transaction::STATUS_COMPLETED,
            'completed_at' => now(),
            'description' => __('wallet.charge_approved_description'),
            'metadata' => ['financial_request_id' => $request->id],
        ]);
    }

    protected function debitWithdrawable(int $userId, float $amount, FinancialRequest $request): void
    {
        $balance = Balance::getOrCreateForUser($userId);
        if ((float) $balance->withdrawable < $amount) {
            throw new \RuntimeException('INSUFFICIENT_WITHDRAWABLE');
        }
        $before = (float) $balance->withdrawable;
        $balance->decrement('withdrawable', $amount);
        $balance->decrement('available', $amount);

        Transaction::create([
            'user_id' => $userId,
            'type' => Transaction::TYPE_WITHDRAWAL,
            'amount' => -$amount,
            'status' => Transaction::STATUS_COMPLETED,
            'completed_at' => now(),
            'description' => __('wallet.withdrawal_approved_description'),
            'metadata' => ['financial_request_id' => $request->id],
        ]);
    }

    protected function recordEvent(FinancialRequest $request, ?int $actorId, string $event, array $payload): void
    {
        FinancialRequestEvent::create([
            'financial_request_id' => $request->id,
            'actor_id' => $actorId,
            'event' => $event,
            'payload' => $payload,
        ]);
    }
}
