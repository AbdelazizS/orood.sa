<?php

namespace App\Services\Finance;

use App\Models\Balance;
use App\Models\CodPolicyAcceptance;
use App\Models\OrderPaymentRequest;
use App\Models\OrderPaymentRequestValue;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrderPaymentOrchestrator
{
    public function __construct(
        private readonly PaymentMethodService $paymentMethods,
        private readonly PaymentEligibilityEngine $eligibility,
        private readonly DynamicFormValidator $validator,
        private readonly FinancialNotificationDispatcher $notifications,
    ) {}

    /**
     * @param  array<string, mixed>  $validated  purchase payload + payment fields
     */
    public function createPurchase(User $buyer, Product $product, array $validated): Purchase
    {
        $legacyMethod = $validated['payment_method'] ?? 'escrow';
        $method = $this->resolveMethod($legacyMethod);

        if ($legacyMethod === 'cod') {
            $codEval = app(CodPolicyEngine::class)->evaluate($product, $buyer, $product->seller);
            if (! $codEval['allowed']) {
                throw new \InvalidArgumentException('COD_NOT_ALLOWED');
            }
            if ($codEval['buyer_must_accept'] && empty($validated['cod_accepted'])) {
                throw new \InvalidArgumentException('COD_ACCEPTANCE_REQUIRED');
            }
        }

        if ($legacyMethod === 'direct_transfer') {
            return $this->createDirectTransferPurchase($buyer, $product, $validated, $method);
        }

        return $this->createEscrowOrCodPurchase($buyer, $product, $validated, $legacyMethod, $method);
    }

    protected function resolveMethod(string $legacyCode): ?PaymentMethod
    {
        return PaymentMethod::query()
            ->where('enabled', true)
            ->get()
            ->first(fn (PaymentMethod $m) => data_get($m->config, 'legacy_code') === $legacyCode
                || $m->code === $legacyCode);
    }

    protected function createEscrowOrCodPurchase(
        User $buyer,
        Product $product,
        array $validated,
        string $legacyMethod,
        ?PaymentMethod $method,
    ): Purchase {
        $quantity = max(1, (int) ($validated['quantity'] ?? 1));
        $totalAmount = (float) ($product->price ?? 0) * $quantity;
        $status = $legacyMethod === 'escrow'
            ? Purchase::STATUS_AWAITING_PAYMENT
            : Purchase::STATUS_COD_REQUESTED;

        return DB::transaction(function () use ($buyer, $product, $validated, $quantity, $totalAmount, $legacyMethod, $method, $status) {
            $purchase = Purchase::create([
                'product_id' => $product->id,
                'buyer_id' => $buyer->id,
                'seller_id' => $product->user_id,
                'amount' => $totalAmount,
                'quantity' => $quantity,
                'payment_method' => $legacyMethod,
                'payment_method_id' => $method?->id,
                'status' => $status,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'shipping_lat' => $validated['shipping_lat'] ?? null,
                'shipping_lng' => $validated['shipping_lng'] ?? null,
                'buyer_note' => $validated['buyer_note'] ?? null,
                'buyer_phone' => $validated['buyer_phone'] ?? $buyer->phone,
                'buyer_email' => $validated['buyer_email'] ?? $buyer->email,
                'buyer_name' => $validated['buyer_name'] ?? $buyer->name,
                'cod_policy_accepted_at' => ! empty($validated['cod_accepted']) ? now() : null,
            ]);

            if ($legacyMethod === 'cod' && ! empty($validated['cod_accepted'])) {
                CodPolicyAcceptance::create([
                    'purchase_id' => $purchase->id,
                    'buyer_id' => $buyer->id,
                    'accepted_at' => now(),
                    'policy_snapshot' => app(CodPolicyEngine::class)->evaluate($product, $buyer),
                ]);
            }

            if ($legacyMethod === 'escrow') {
                $buyerBalance = Balance::getOrCreateForUser($buyer->id);
                if ((float) $buyerBalance->available < $totalAmount) {
                    throw new \RuntimeException('INSUFFICIENT_BALANCE');
                }
                $buyerBalance->decrement('available', $totalAmount);
                $buyerBalance->increment('escrow', $totalAmount);

                Transaction::create([
                    'user_id' => $buyer->id,
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
    }

    protected function createDirectTransferPurchase(
        User $buyer,
        Product $product,
        array $validated,
        ?PaymentMethod $method,
    ): Purchase {
        $quantity = max(1, (int) ($validated['quantity'] ?? 1));
        $totalAmount = (float) ($product->price ?? 0) * $quantity;

        $fields = $method
            ? $this->paymentMethods->fieldsForContext($method, 'order_payment')
            : collect();
        $paymentFields = $validated['payment_fields'] ?? [];
        if ($fields->isNotEmpty()) {
            $this->validator->validate($fields, $paymentFields);
        }

        return DB::transaction(function () use ($buyer, $product, $validated, $quantity, $totalAmount, $method, $paymentFields) {
            $purchase = Purchase::create([
                'product_id' => $product->id,
                'buyer_id' => $buyer->id,
                'seller_id' => $product->user_id,
                'amount' => $totalAmount,
                'quantity' => $quantity,
                'payment_method' => 'direct_transfer',
                'payment_method_id' => $method?->id,
                'status' => Purchase::STATUS_PENDING,
                'buyer_transfer_confirmed_at' => now(),
                'buyer_transfer_confirmed_by' => $buyer->id,
                'shipping_address' => $validated['shipping_address'] ?? null,
                'shipping_lat' => $validated['shipping_lat'] ?? null,
                'shipping_lng' => $validated['shipping_lng'] ?? null,
                'buyer_note' => $validated['buyer_note'] ?? null,
                'buyer_phone' => $validated['buyer_phone'] ?? $buyer->phone,
                'buyer_email' => $validated['buyer_email'] ?? $buyer->email,
                'buyer_name' => $validated['buyer_name'] ?? $buyer->name,
            ]);

            $opr = OrderPaymentRequest::create([
                'purchase_id' => $purchase->id,
                'payment_method_id' => $method->id,
                'status' => OrderPaymentRequest::STATUS_PENDING,
                'amount' => $totalAmount,
                'submitted_by' => $buyer->id,
            ]);

            foreach ($paymentFields as $key => $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                OrderPaymentRequestValue::create([
                    'order_payment_request_id' => $opr->id,
                    'field_key' => $key,
                    'value_text' => is_scalar($value) ? (string) $value : null,
                    'file_url' => $key === 'receipt_url' ? (string) $value : null,
                ]);
            }

            return $purchase;
        });
    }
}
