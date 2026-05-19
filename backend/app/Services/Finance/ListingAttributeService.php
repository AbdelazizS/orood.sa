<?php

namespace App\Services\Finance;

use App\Models\CategoryFieldDefinition;
use App\Models\ListingAttributeValue;
use App\Models\Product;
use Illuminate\Support\Collection;

class ListingAttributeService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function sync(Product $product, array $attributes): void
    {
        if ($attributes === []) {
            return;
        }

        $definitions = CategoryFieldDefinition::query()
            ->where('category_id', $product->category_id)
            ->when($product->subcategory_id, fn ($q) => $q->where(function ($inner) use ($product) {
                $inner->whereNull('subcategory_id')
                    ->orWhere('subcategory_id', $product->subcategory_id);
            }))
            ->get()
            ->keyBy('field_key');

        foreach ($attributes as $key => $value) {
            $def = $definitions->get($key);
            if (! $def || $value === null || $value === '') {
                continue;
            }

            ListingAttributeValue::updateOrCreate(
                [
                    'product_id' => $product->id,
                    'category_field_definition_id' => $def->id,
                ],
                [
                    'value_text' => is_scalar($value) ? (string) $value : null,
                    'value_json' => is_array($value) ? $value : null,
                ]
            );
        }
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function forProduct(Product $product): Collection
    {
        return ListingAttributeValue::query()
            ->where('product_id', $product->id)
            ->with('definition')
            ->get()
            ->map(fn (ListingAttributeValue $row) => [
                'field_key' => $row->definition?->field_key,
                'label' => $row->definition?->label_ar,
                'value' => $row->value_text ?? $row->value_json,
                'field_type' => $row->definition?->field_type,
            ])
            ->filter(fn ($row) => $row['field_key'] !== null)
            ->values();
    }
}
