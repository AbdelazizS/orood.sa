<?php

namespace App\Services\Listings;

use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Models\ListingAttributeValue;
use App\Models\Product;
use Illuminate\Support\Collection;

class ListingAttributeSchemaService
{
    public function __construct(private readonly ListingSchemaService $schemas) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function sync(Product $product, array $attributes, ?int $schemaId = null): void
    {
        if ($attributes === []) {
            return;
        }

        $schema = $schemaId
            ? CategoryListingSchema::query()->with('fields')->find($schemaId)
            : $this->schemas->resolvePublishedSchema(
                (int) $product->category_id,
                $product->subcategory_id ? (int) $product->subcategory_id : null,
                $product->type ?? 'offer'
            );

        if (! $schema) {
            return;
        }

        $definitions = $schema->fields->keyBy('field_key');
        $submittedKeys = [];

        foreach ($attributes as $key => $value) {
            $def = $definitions->get($key);
            if (! $def) {
                continue;
            }
            $submittedKeys[] = $key;

            if ($value === null || $value === '' || $value === false) {
                ListingAttributeValue::query()
                    ->where('product_id', $product->id)
                    ->where('category_schema_field_id', $def->id)
                    ->delete();

                continue;
            }

            ListingAttributeValue::updateOrCreate(
                [
                    'product_id' => $product->id,
                    'category_schema_field_id' => $def->id,
                ],
                [
                    'category_field_definition_id' => null,
                    'value_text' => is_scalar($value) ? (string) $value : null,
                    'value_json' => is_array($value) ? $value : (is_bool($value) ? $value : null),
                ]
            );
        }

        if ($submittedKeys !== []) {
            $keepIds = $definitions->only($submittedKeys)->pluck('id');
            ListingAttributeValue::query()
                ->where('product_id', $product->id)
                ->whereNotNull('category_schema_field_id')
                ->whereNotIn('category_schema_field_id', $keepIds)
                ->delete();
        }
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function forProduct(Product $product, ?string $locale = null): Collection
    {
        $locale = $locale === 'en' ? 'en' : 'ar';

        return ListingAttributeValue::query()
            ->where('product_id', $product->id)
            ->with(['schemaField.section'])
            ->get()
            ->map(function (ListingAttributeValue $row) use ($locale) {
                $field = $row->schemaField;
                if (! $field) {
                    return null;
                }

                $raw = $row->value_json ?? $row->value_text;

                return $this->fieldRowPayload($field, $raw, $locale);
            })
            ->filter()
            ->sortBy('sort_order')
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesMapForProduct(Product $product): array
    {
        return ListingAttributeValue::query()
            ->where('product_id', $product->id)
            ->whereNotNull('category_schema_field_id')
            ->with('schemaField')
            ->get()
            ->mapWithKeys(function (ListingAttributeValue $row) {
                $key = $row->schemaField?->field_key;
                if (! $key) {
                    return [];
                }
                $val = $row->value_json ?? $row->value_text;
                $type = $row->schemaField?->field_type;
                if (in_array($type, ['switch', 'checkbox'], true)) {
                    if ($val === '1' || $val === 'true' || $val === 1) {
                        $val = true;
                    } elseif ($val === '0' || $val === 'false' || $val === 0) {
                        $val = false;
                    }
                }

                return [$key => $val];
            })
            ->filter(fn ($v, $k) => $k !== null && $k !== '')
            ->all();
    }

    /**
     * @return list<array{key: string, title: string, fields: list<array<string, mixed>>}>
     */
    public function sectionsForProduct(Product $product, ?string $locale = null): array
    {
        $rows = $this->forProduct($product, $locale);
        $grouped = [];
        foreach ($rows as $row) {
            $key = $row['section_key'] ?? 'default';
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'key' => $key,
                    'title' => $row['section_title'] ?? $key,
                    'section_sort_order' => $row['section_sort_order'] ?? 99,
                    'fields' => [],
                ];
            }
            $grouped[$key]['fields'][] = $row;
        }

        $sections = array_values($grouped);
        usort($sections, fn ($a, $b) => ($a['section_sort_order'] ?? 99) <=> ($b['section_sort_order'] ?? 99));

        return $sections;
    }

    /**
     * DB-backed sections, or virtual sections from published schema + attribute map (legacy / partial sync).
     *
     * @param  array<string, mixed>  $attributeMap  Merged listing attributes (schema + legacy RE)
     * @return list<array{key: string, title: string, fields: list<array<string, mixed>>}>
     */
    public function sectionsForProductWithFallback(Product $product, ?string $locale = null, array $attributeMap = []): array
    {
        $locale = $locale === 'en' ? 'en' : 'ar';

        $sections = $this->sectionsForProduct($product, $locale);
        if ($sections !== []) {
            return $sections;
        }

        if ($attributeMap === []) {
            $attributeMap = $this->attributesMapForProduct($product);
        }

        if ($attributeMap === []) {
            return [];
        }

        $schema = $this->schemas->resolvePublishedSchema(
            (int) $product->category_id,
            $product->subcategory_id ? (int) $product->subcategory_id : null,
            $product->type ?? 'offer'
        );

        if (! $schema) {
            return [];
        }

        $visible = $this->schemas->visibleFields($schema, $attributeMap)
            ->reject(fn (CategorySchemaField $f) => $f->isLayoutBlock());

        $grouped = [];
        foreach ($visible as $field) {
            $key = $field->field_key;
            if (! array_key_exists($key, $attributeMap) || ! $this->isTruthyAttributeValue($attributeMap[$key])) {
                continue;
            }

            $raw = $attributeMap[$key];
            $sectionKey = $field->section?->section_key ?? 'default';
            if (! isset($grouped[$sectionKey])) {
                $grouped[$sectionKey] = [
                    'key' => $sectionKey,
                    'title' => $field->section?->localizedTitle($locale) ?? $sectionKey,
                    'section_sort_order' => $field->section?->sort_order ?? 99,
                    'fields' => [],
                ];
            }
            $grouped[$sectionKey]['fields'][] = $this->fieldRowPayload($field, $raw, $locale, true);
        }

        foreach ($grouped as &$section) {
            usort($section['fields'], fn ($a, $b) => ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0));
        }
        unset($section);

        $sections = array_values($grouped);
        usort($sections, fn ($a, $b) => ($a['section_sort_order'] ?? 99) <=> ($b['section_sort_order'] ?? 99));

        return $sections;
    }

    /**
     * @return array<string, mixed>
     */
    protected function fieldRowPayload(
        CategorySchemaField $field,
        mixed $raw,
        string $locale,
        bool $chipOnlySwitches = false,
    ): array {
        $config = is_array($field->config_json) ? $field->config_json : [];
        $isSwitch = in_array($field->field_type, ['switch', 'checkbox'], true);
        $display = $this->formatDisplayValue($field, $raw, $locale);
        if ($chipOnlySwitches && $isSwitch) {
            $display = '';
        }

        return [
            'field_key' => $field->field_key,
            'label' => $field->localizedLabel($locale),
            'value' => $raw,
            'display_value' => $display,
            'field_type' => $field->field_type,
            'section_key' => $field->section?->section_key,
            'section_title' => $field->section?->localizedTitle($locale),
            'section_sort_order' => $field->section?->sort_order ?? 99,
            'show_on_card' => $field->show_on_card,
            'sort_order' => $field->sort_order,
            'options' => $field->options ?? [],
            'icon' => isset($config['icon']) && is_string($config['icon']) ? $config['icon'] : null,
        ];
    }

    protected function isTruthyAttributeValue(mixed $value): bool
    {
        if ($value === true || $value === 'true' || $value === 1 || $value === '1') {
            return true;
        }
        if ($value === false || $value === 'false' || $value === 0 || $value === '0') {
            return false;
        }

        return $value !== null && $value !== '';
    }

    /**
     * @param  mixed  $value
     */
    public function formatDisplayValue(CategorySchemaField $field, mixed $value, ?string $locale = null): string
    {
        $locale = $locale === 'en' ? 'en' : 'ar';

        if ($value === null || $value === '') {
            return '';
        }

        if (in_array($field->field_type, ['switch', 'checkbox'], true)) {
            $bool = filter_var($value, FILTER_VALIDATE_BOOLEAN);

            return $bool
                ? ($locale === 'en' ? 'Yes' : 'نعم')
                : ($locale === 'en' ? 'No' : 'لا');
        }

        if (in_array($field->field_type, ['select', 'radio', 'condition'], true) && is_scalar($value)) {
            foreach ($field->options ?? [] as $opt) {
                if (! is_array($opt)) {
                    continue;
                }
                if ((string) ($opt['value'] ?? '') === (string) $value) {
                    return $locale === 'en'
                        ? (string) ($opt['label_en'] ?? $opt['label_ar'] ?? $value)
                        : (string) ($opt['label_ar'] ?? $opt['label_en'] ?? $value);
                }
            }
        }

        if (is_array($value)) {
            return implode($locale === 'en' ? ', ' : '، ', array_map('strval', $value));
        }

        if (is_bool($value)) {
            return $value ? ($locale === 'en' ? 'Yes' : 'نعم') : ($locale === 'en' ? 'No' : 'لا');
        }

        return (string) $value;
    }
}
