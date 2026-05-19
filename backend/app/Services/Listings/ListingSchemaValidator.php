<?php

namespace App\Services\Listings;

use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Services\Finance\PhoneNormalizationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ListingSchemaValidator
{
    public function __construct(
        private readonly ListingSchemaService $schemas,
        private readonly PhoneNormalizationService $phones,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function validate(CategoryListingSchema $schema, array $input): array
    {
        $visible = $this->schemas->visibleFields($schema, $input)
            ->reject(fn (CategorySchemaField $f) => $f->isLayoutBlock());

        $input = $this->filterInputToVisibleFields($visible, $input);
        $input = $this->normalizeInputTypes($visible, $input);

        $rules = [];
        $attributes = [];

        foreach ($visible as $field) {
            $key = $field->field_key;
            $fieldRules = $field->required ? ['required'] : ['nullable'];
            $fieldRules = array_merge($fieldRules, $this->rulesForType($field));

            if (is_array($field->validation_rules)) {
                foreach ($field->validation_rules as $rule) {
                    if (is_string($rule)) {
                        $fieldRules[] = $rule;
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

            $optionRule = $this->optionInRule($field);
            if ($optionRule !== null) {
                $fieldRules[] = $optionRule;
            }

            $rules[$key] = $fieldRules;
            $attributes[$key] = $field->localizedLabel();
        }

        $validator = Validator::make($input, $rules, [], $attributes);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();

        foreach ($visible as $field) {
            if ($field->field_type === 'phone' && isset($validated[$field->field_key])) {
                $normalized = $this->phones->normalize((string) $validated[$field->field_key]);
                if (! $this->phones->isValidSaudiMobile($normalized)) {
                    throw ValidationException::withMessages([
                        $field->field_key => [__('validation.phone', ['attribute' => $field->localizedLabel()])],
                    ]);
                }
                $validated[$field->field_key] = $normalized;
            }
        }

        return $validated;
    }

    /**
     * @param  Collection<int, CategorySchemaField>  $visible
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    protected function filterInputToVisibleFields(Collection $visible, array $input): array
    {
        $allowed = $visible->pluck('field_key')->all();
        $filtered = [];

        foreach ($allowed as $key) {
            if (array_key_exists($key, $input)) {
                $filtered[$key] = $input[$key];
            }
        }

        return $filtered;
    }

    /**
     * @param  Collection<int, CategorySchemaField>  $visible
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    protected function normalizeInputTypes(Collection $visible, array $input): array
    {
        foreach ($visible as $field) {
            $key = $field->field_key;
            if (! array_key_exists($key, $input)) {
                continue;
            }

            if (in_array($field->field_type, ['switch', 'checkbox'], true)) {
                $input[$key] = filter_var($input[$key], FILTER_VALIDATE_BOOLEAN);

                continue;
            }

            if (in_array($field->field_type, ['number', 'amount'], true) && is_numeric($input[$key])) {
                $input[$key] = $input[$key] + 0;
            }
        }

        return $input;
    }

    /**
     * @return list<string>
     */
    protected function optionInRule(CategorySchemaField $field): ?string
    {
        if (! in_array($field->field_type, ['select', 'radio', 'condition'], true)) {
            return null;
        }

        $options = $field->options ?? [];
        if (! is_array($options) || $options === []) {
            return null;
        }

        $values = [];
        foreach ($options as $opt) {
            if (is_array($opt) && isset($opt['value'])) {
                $values[] = (string) $opt['value'];
            }
        }

        return $values === [] ? null : 'in:'.implode(',', $values);
    }

    /**
     * @return list<string>
     */
    protected function rulesForType(CategorySchemaField $field): array
    {
        return match ($field->field_type) {
            'number', 'amount' => ['numeric'],
            'checkbox', 'switch' => ['boolean'],
            'multiselect', 'tags', 'features', 'repeater' => ['array'],
            'map' => ['array'],
            'date' => ['date'],
            'upload', 'image', 'image_upload', 'video', 'video_upload', 'file' => ['string', 'max:500'],
            'email' => ['email', 'max:255'],
            'select', 'radio', 'condition' => ['string', 'max:255'],
            default => ['string', 'max:2000'],
        };
    }

    /**
     * @param  array<string, mixed>  $policies
     */
    public function validatePolicies(array $policies, array $productData): void
    {
        $location = $policies['location'] ?? [];
        $mode = $location['mode'] ?? 'region_only';
        $required = (bool) ($location['required'] ?? false);

        if ($mode === 'exact_map' || ($required && $mode !== 'hidden')) {
            if ($mode === 'exact_map' || $mode === 'optional') {
                if ($required && (empty($productData['location_lat']) || empty($productData['location_lng']))) {
                    throw ValidationException::withMessages([
                        'location_lat' => [__('validation.required', ['attribute' => __('listings.location')])],
                    ]);
                }
            }
            if ($mode === 'region_only' || $mode === 'city_only') {
                if ($required && empty($productData['city_id'])) {
                    throw ValidationException::withMessages([
                        'city_id' => [__('validation.required', ['attribute' => __('listings.city')])],
                    ]);
                }
            }
        }

        $media = $policies['media'] ?? [];
        $minImages = (int) ($media['min_images'] ?? 0);
        $imageCount = count($productData['image_urls'] ?? []);
        if ($minImages > 0 && $imageCount < $minImages) {
            throw ValidationException::withMessages([
                'image_urls' => [__('validation.min.array', ['attribute' => __('listings.images'), 'min' => $minImages])],
            ]);
        }
    }
}
