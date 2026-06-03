<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ChecksFinanceModules;
use App\Models\Balance;
use App\Models\ChargeRequest;
use App\Models\FinancialRequest;
use App\Models\WithdrawalRequest;
use App\Services\Finance\FinancialRequestService;
use App\Services\Finance\FinanceModuleSettings;
use App\Services\Finance\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletFinancialRequestController extends Controller
{
    use ChecksFinanceModules;

    public function __construct(
        private readonly FinancialRequestService $financialRequests,
        private readonly PaymentMethodService $paymentMethods,
        private readonly FinanceModuleSettings $financeModules,
    ) {}

    public function charge(Request $request): JsonResponse
    {
        if ($response = $this->ensureWallet($this->financeModules)) {
            return $response;
        }

        $user = $request->user();
        $validated = $request->validate([
            'payment_method_id' => ['nullable', 'integer', 'exists:payment_methods,id'],
            'payment_method_code' => ['nullable', 'string', 'max:64'],
            'values' => ['sometimes', 'array'],
            'amount' => ['sometimes', 'numeric'],
            'payer_bank_name' => ['sometimes', 'string', 'max:255'],
            'transfer_reference' => ['sometimes', 'string', 'max:255'],
            'receipt_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'idempotency_key' => ['sometimes', 'nullable', 'string', 'max:191'],
        ]);

        $method = $this->resolveMethod($validated);
        if (! $method) {
            return response()->json(['message' => __('finance.payment_method_not_found')], 422);
        }

        $fields = $this->paymentMethods->fieldsForContext($method, 'charge');
        $input = $this->normalizeInput($validated);
        $idempotencyKey = $request->header('Idempotency-Key') ?: ($input['idempotency_key'] ?? null);

        if ($idempotencyKey && strlen($idempotencyKey) < 8) {
            return response()->json(['message' => __('wallet.idempotency_key_min_length')], 422);
        }

        if ($idempotencyKey) {
            $existing = FinancialRequest::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return response()->json([
                    'message' => __('wallet.charge_submitted'),
                    'data' => ['financial_request' => $existing->load('values'), 'idempotent_replay' => true],
                ]);
            }
        }

        $amount = isset($input['amount']) ? (float) $input['amount'] : null;

        $financial = $this->financialRequests->submit(
            $user,
            FinancialRequest::TYPE_WALLET_CHARGE,
            $fields,
            $input,
            $amount,
            $method->id,
            null,
            $idempotencyKey,
        );

        $chargeRequest = ChargeRequest::create([
            'user_id' => $user->id,
            'amount' => (float) ($financial->amount ?? $amount ?? 0),
            'payment_method' => $method->code,
            'payer_bank_name' => (string) ($input['payer_bank_name'] ?? ''),
            'transfer_reference' => (string) ($input['transfer_reference'] ?? ''),
            'receipt_url' => $input['receipt_url'] ?? null,
            'note' => $input['note'] ?? null,
            'submitted_at' => now(),
            'status' => ChargeRequest::STATUS_PENDING,
            'idempotency_key' => $idempotencyKey,
        ]);

        $financial->update(['legacy_charge_request_id' => $chargeRequest->id]);

        return response()->json([
            'message' => __('wallet.charge_submitted'),
            'data' => [
                'financial_request' => $financial,
                'charge_request' => $chargeRequest,
                'status' => 'pending_review',
            ],
        ], 201);
    }

    public function withdraw(Request $request): JsonResponse
    {
        if ($response = $this->ensureWallet($this->financeModules)) {
            return $response;
        }

        $user = $request->user();
        $validated = $request->validate([
            'payment_method_id' => ['nullable', 'integer', 'exists:payment_methods,id'],
            'payment_method_code' => ['nullable', 'string', 'max:64'],
            'values' => ['sometimes', 'array'],
            'amount' => ['sometimes', 'numeric'],
            'bank_name' => ['sometimes', 'string', 'max:255'],
            'bank_iban' => ['sometimes', 'string', 'max:50'],
            'account_holder' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $method = $this->resolveMethod($validated);
        $fields = $method
            ? $this->paymentMethods->fieldsForContext($method, 'withdraw')
            : $this->paymentMethods->fieldsForContext(null, 'withdraw');

        $input = $this->normalizeInput($validated);
        $amount = (float) ($input['amount'] ?? 0);

        if ($method && $method->min_amount !== null && $amount < (float) $method->min_amount) {
            return response()->json(['message' => __('wallet.charge_min_amount', ['min' => $method->min_amount])], 422);
        }

        $balance = Balance::getOrCreateForUser($user->id);
        $withdrawable = (float) ($balance->withdrawable ?? 0);
        $pendingSum = (float) WithdrawalRequest::where('user_id', $user->id)
            ->where('status', WithdrawalRequest::STATUS_PENDING)
            ->sum('amount');
        if ($withdrawable - $pendingSum < $amount) {
            return response()->json(['message' => __('wallet.insufficient_withdrawable')], 422);
        }

        $financial = $this->financialRequests->submit(
            $user,
            FinancialRequest::TYPE_WALLET_WITHDRAW,
            $fields,
            $input,
            $amount,
            $method?->id,
        );

        $withdrawal = WithdrawalRequest::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'bank_name' => (string) ($input['bank_name'] ?? ''),
            'bank_iban' => (string) ($input['bank_iban'] ?? ''),
            'account_holder' => (string) ($input['account_holder'] ?? $user->name),
            'status' => WithdrawalRequest::STATUS_PENDING,
        ]);

        $financial->update(['legacy_withdrawal_request_id' => $withdrawal->id]);

        return response()->json([
            'message' => __('wallet.withdrawal_submitted'),
            'data' => [
                'financial_request' => $financial,
                'withdrawal_request' => $withdrawal,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        if ($response = $this->ensureWallet($this->financeModules)) {
            return $response;
        }

        $type = $request->query('type');
        $rows = FinancialRequest::query()
            ->where('user_id', $request->user()->id)
            ->when($type, fn ($q) => $q->where('type', $type))
            ->with(['values', 'paymentMethod'])
            ->latest('id')
            ->paginate(20);

        return response()->json($rows);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    protected function resolveMethod(array $validated): ?\App\Models\PaymentMethod
    {
        if (! empty($validated['payment_method_id'])) {
            return $this->paymentMethods->getById((int) $validated['payment_method_id']);
        }

        if (! empty($validated['payment_method_code'])) {
            return $this->paymentMethods->getByCode($validated['payment_method_code']);
        }

        return $this->paymentMethods->getByCode('bank_transfer');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function normalizeInput(array $validated): array
    {
        $values = is_array($validated['values'] ?? null) ? $validated['values'] : [];
        unset($validated['values'], $validated['payment_method_id'], $validated['payment_method_code']);

        return array_merge($validated, $values);
    }
}
