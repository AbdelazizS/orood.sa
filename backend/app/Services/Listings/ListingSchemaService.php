<?php

namespace App\Services\Listings;

use App\Models\Category;
use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Models\Subcategory;
use Illuminate\Support\Collection;

class ListingSchemaService
{
    public function isDynamicSchemaEnabled(?Category $category): bool
    {
        if ($category?->dynamic_schema_enabled) {
            return true;
        }

        return (bool) config('listings.dynamic_schema_enabled', false);
    }

    public function resolvePublishedSchema(
        int $categoryId,
        ?int $subcategoryId = null,
        string $listingType = 'offer'
    ): ?CategoryListingSchema {
        $query = CategoryListingSchema::query()
            ->where('category_id', $categoryId)
            ->where('listing_type', $listingType)
            ->where('status', CategoryListingSchema::STATUS_PUBLISHED)
            ->with([
                'sections',
                'fields.fieldOptions',
                'fields.section',
                'policy',
                'agreements',
            ]);

        if ($subcategoryId) {
            foreach ($this->subcategoryAncestorIds($subcategoryId) as $candidateId) {
                $specific = (clone $query)
                    ->where('subcategory_id', $candidateId)
                    ->orderByDesc('version')
                    ->first();

                if ($specific) {
                    return $specific;
                }
            }
        }

        return $query
            ->whereNull('subcategory_id')
            ->orderByDesc('version')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeForApi(CategoryListingSchema $schema, ?string $locale = null): array
    {
        $locale = $locale === 'en' ? 'en' : 'ar';
        $sectionsById = $schema->sections->keyBy('id');

        $fields = $schema->fields->map(function (CategorySchemaField $field) use ($sectionsById, $locale) {
            $section = $field->section_id ? $sectionsById->get($field->section_id) : null;
            $options = $field->fieldOptions->isNotEmpty()
                ? $field->fieldOptions->map(fn ($opt) => [
                    'value' => $opt->value,
                    'label' => $opt->localizedLabel($locale),
                ])->values()->all()
                : collect($field->options ?? [])->map(function ($opt) use ($locale) {
                    if (! is_array($opt)) {
                        return $opt;
                    }
                    $label = $locale === 'en'
                        ? ($opt['label_en'] ?? $opt['label_ar'] ?? $opt['label'] ?? $opt['value'] ?? '')
                        : ($opt['label_ar'] ?? $opt['label_en'] ?? $opt['label'] ?? $opt['value'] ?? '');

                    return [
                        'value' => (string) ($opt['value'] ?? ''),
                        'label' => (string) $label,
                    ];
                })->values()->all();

            return [
                'id' => $field->id,
                'field_key' => $field->field_key,
                'field_type' => $field->field_type,
                'section_key' => $section?->section_key,
                'label' => $field->localizedLabel($locale),
                'placeholder' => $locale === 'en' ? ($field->placeholder_en ?? $field->placeholder_ar) : $field->placeholder_ar,
                'help' => $locale === 'en' ? ($field->help_en ?? $field->help_ar) : $field->help_ar,
                'required' => $field->required,
                'options' => $options,
                'visible_when' => $field->visible_when,
                'config' => $field->config_json ?? [],
                'sort_order' => $field->sort_order,
                'filterable' => $field->filterable,
                'show_on_card' => $field->show_on_card,
            ];
        })->values()->all();

        $sections = $schema->sections->map(fn ($section) => [
            'key' => $section->section_key,
            'title' => $section->localizedTitle($locale),
            'sort_order' => $section->sort_order,
            'visible_when' => $section->visible_when,
        ])->values()->all();

        $policy = $schema->policy;
        $defaultPolicies = $this->defaultPolicies();

        return [
            'schema_id' => $schema->id,
            'schema_version' => $schema->version,
            'category_id' => $schema->category_id,
            'subcategory_id' => $schema->subcategory_id,
            'listing_type' => $schema->listing_type,
            'sections' => $sections,
            'fields' => $fields,
            'policies' => [
                'location' => array_merge($defaultPolicies['location'], $policy?->location_policy ?? []),
                'price' => array_merge($defaultPolicies['price'], $policy?->price_policy ?? []),
                'media' => array_merge($defaultPolicies['media'], $policy?->media_policy ?? []),
                'communication' => array_merge($defaultPolicies['communication'], $policy?->communication_policy ?? []),
            ],
            'agreements' => $schema->agreements->map(fn ($agreement) => [
                'id' => $agreement->id,
                'content' => $agreement->localizedContent($locale),
                'required' => $agreement->required,
                'sort_order' => $agreement->sort_order,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function defaultPolicies(): array
    {
        return [
            'location' => [
                'mode' => 'region_only',
                'required' => false,
            ],
            'price' => [
                'modes' => ['fixed', 'negotiable', 'bid'],
                'default' => 'fixed',
                'required' => false,
            ],
            'media' => [
                'max_images' => 10,
                'min_images' => 0,
                'video' => false,
                'max_upload_mb' => 10,
            ],
            'communication' => [
                'methods' => ['phone', 'messages'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function evaluateVisibleWhen(?array $visibleWhen, array $attributes): bool
    {
        if ($visibleWhen === null || $visibleWhen === []) {
            return true;
        }

        foreach ($visibleWhen as $key => $expected) {
            $actual = $attributes[$key] ?? null;
            if (is_array($expected)) {
                if (! in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ($actual != $expected) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return Collection<int, CategorySchemaField>
     */
    public function visibleFields(CategoryListingSchema $schema, array $attributes): Collection
    {
        return $schema->fields->filter(function (CategorySchemaField $field) use ($attributes) {
            if ($field->isLayoutBlock()) {
                return true;
            }

            return $this->evaluateVisibleWhen($field->visible_when, $attributes);
        })->values();
    }

    /**
     * Leaf first, then ancestors up to root.
     *
     * @return list<int>
     */
    private function subcategoryAncestorIds(int $subcategoryId): array
    {
        $ids = [];
        $current = Subcategory::query()->find($subcategoryId);

        while ($current) {
            $ids[] = (int) $current->id;
            if (! $current->parent_id) {
                break;
            }
            $current = Subcategory::query()->find($current->parent_id);
        }

        return $ids;
    }
}
