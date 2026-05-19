<?php

namespace App\Services\Finance;

use App\Models\PaymentMethod;
use App\Models\PaymentMethodField;
use Illuminate\Support\Collection;

class PaymentMethodService
{
    public function getByCode(string $code): ?PaymentMethod
    {
        return PaymentMethod::query()->where('code', $code)->where('enabled', true)->first();
    }

    public function getById(int $id): ?PaymentMethod
    {
        return PaymentMethod::query()->where('id', $id)->where('enabled', true)->first();
    }

    /**
     * Wallet recharge/withdraw methods only (must have fields for the context).
     *
     * @return \Illuminate\Support\Collection<int, PaymentMethod>
     */
    public function enabledForWalletContext(string $context): \Illuminate\Support\Collection
    {
        return PaymentMethod::query()
            ->where('enabled', true)
            ->where('code', '!=', 'stc_pay')
            ->whereHas('fields', fn ($q) => $q->where('context', $context))
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeField(PaymentMethodField $field, string $locale = 'ar'): array
    {
        return [
            'id' => $field->id,
            'field_key' => $field->field_key,
            'field_type' => $field->field_type,
            'label' => $field->localizedLabel($locale),
            'placeholder' => $locale === 'en' ? $field->placeholder_en : $field->placeholder_ar,
            'help' => $locale === 'en' ? $field->help_en : $field->help_ar,
            'required' => $field->required,
            'options' => $field->options,
            'sort_order' => $field->sort_order,
            'config' => $field->config_json ?? $field->visible_when,
            'is_layout_block' => (bool) ($field->is_layout_block ?? false),
            'block_style' => $field->block_style,
        ];
    }

    /**
     * @return Collection<int, PaymentMethod>
     */
    public function enabledForContext(string $context, ?string $audience = null): Collection
    {
        return PaymentMethod::query()
            ->where('enabled', true)
            ->when($audience, fn ($q) => $q->whereIn('audience', [$audience, 'both']))
            ->orderBy('sort_order')
            ->get()
            ->filter(fn (PaymentMethod $m) => $this->fieldsForContext($m, $context)->isNotEmpty()
                || in_array($context, ['checkout', 'charge', 'withdraw', 'guarantee_deposit'], true)
                || $m->code !== PaymentMethod::CODE_BANK_TRANSFER);
    }

    /**
     * @return Collection<int, PaymentMethodField>
     */
    public function fieldsForContext(?PaymentMethod $method, string $context): Collection
    {
        $query = PaymentMethodField::query()->where('context', $context);

        if ($method) {
            $owned = (clone $query)
                ->where('payment_method_id', $method->id)
                ->orderBy('sort_order')
                ->get();

            if ($owned->isNotEmpty()) {
                return $owned;
            }

            return $query->whereNull('payment_method_id')->orderBy('sort_order')->get();
        }

        return $query->whereNull('payment_method_id')->orderBy('sort_order')->get();
    }

    public function legacyPaymentCode(PaymentMethod $method): string
    {
        return (string) data_get($method->config, 'legacy_code', $method->code);
    }
}
