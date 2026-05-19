<?php

namespace App\Services\Finance;

use App\Models\PaymentMethod;
use App\Models\PaymentMethodField;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DynamicFormValidator
{
    public function __construct(private readonly PhoneNormalizationService $phones) {}
    /**
     * @param  Collection<int, PaymentMethodField>  $fields
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function validate(Collection $fields, array $input, ?PaymentMethod $method = null): array
    {
        $rules = [];
        $attributes = [];

        foreach ($fields as $field) {
            if ($field->field_type === 'instruction_block' || ($field->is_layout_block ?? false)) {
                continue;
            }

            $key = $field->field_key;
            $fieldRules = $field->required ? ['required'] : ['nullable'];

            $fieldRules = array_merge($fieldRules, $this->rulesForType($field, $method));

            if (is_array($field->validation_rules)) {
                foreach ($field->validation_rules as $r) {
                    if (is_string($r)) {
                        $fieldRules[] = $r;
                    }
                }
            }

            $config = is_array($field->config_json) ? $field->config_json : [];
            if (isset($config['min']) && is_numeric($config['min'])) {
                $fieldRules[] = 'min:'.$config['min'];
            }
            if (isset($config['max']) && is_numeric($config['max'])) {
                $fieldRules[] = 'max:'.$config['max'];
            }
            if (! empty($config['regex']) && is_string($config['regex'])) {
                $fieldRules[] = 'regex:'.$config['regex'];
            }

            $rules[$key] = $fieldRules;
            $attributes[$key] = $field->localizedLabel();
        }

        $validator = Validator::make($input, $rules, [], $attributes);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();

        foreach ($fields as $field) {
            if ($field->field_type === 'phone' && isset($validated[$field->field_key])) {
                $normalized = $this->phones->normalize((string) $validated[$field->field_key]);
                if (! $this->phones->isValidSaudiMobile($normalized)) {
                    throw ValidationException::withMessages([
                        $field->field_key => [__('validation.phone', ['attribute' => $field->localizedLabel()])],
                    ]);
                }
                $validated[$field->field_key] = $normalized;
            }
            if ($field->field_type === 'iban' && isset($validated[$field->field_key])) {
                $iban = strtoupper(preg_replace('/\s+/', '', (string) $validated[$field->field_key]));
                if (! preg_match('/^SA[0-9]{22}$/', $iban)) {
                    throw ValidationException::withMessages([
                        $field->field_key => [__('finance.iban_invalid')],
                    ]);
                }
                $validated[$field->field_key] = $iban;
            }
        }

        return $validated;
    }

    /**
     * @return list<string>
     */
    protected function rulesForType(PaymentMethodField $field, ?PaymentMethod $method = null): array
    {
        if (in_array($field->field_type, ['amount', 'number'], true) && $method) {
            $rules = ['numeric'];
            if ($method->min_amount !== null) {
                $rules[] = 'min:'.(float) $method->min_amount;
            } else {
                $rules[] = 'min:0';
            }
            if ($method->max_amount !== null) {
                $rules[] = 'max:'.(float) $method->max_amount;
            }

            return $rules;
        }

        return match ($field->field_type) {
            'amount', 'number' => ['numeric', 'min:0'],
            'phone' => ['string', 'max:20'],
            'iban' => ['string', 'max:50'],
            'file', 'upload', 'image', 'image_upload', 'pdf', 'pdf_upload' => ['string', 'max:500'],
            'email' => ['email', 'max:255'],
            default => ['string', 'max:2000'],
        };
    }
}
