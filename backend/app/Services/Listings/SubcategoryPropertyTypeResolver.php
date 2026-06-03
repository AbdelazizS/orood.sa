<?php

namespace App\Services\Listings;

use App\Models\Subcategory;

class SubcategoryPropertyTypeResolver
{
    /** @var list<string> */
    private const PROPERTY_TYPES = [
        'apartment',
        'villa',
        'land',
        'building',
        'floor',
        'shop',
        'farm',
    ];

    /** @var array<string, string> */
    private const SLUG_SUFFIX_MAP = [
        'apartments' => 'apartment',
        'villas' => 'villa',
        'land' => 'land',
        'building' => 'building',
        'buildings' => 'building',
        'floor' => 'floor',
        'floors' => 'floor',
        'shop' => 'shop',
        'shops' => 'shop',
        'farm' => 'farm',
        'farms' => 'farm',
    ];

    public function resolve(?Subcategory $subcategory): ?string
    {
        if (! $subcategory) {
            return null;
        }

        foreach ($subcategory->ancestorChainIncludingSelf() as $node) {
            $explicit = $node->listing_property_type;
            if (is_string($explicit) && $explicit !== '' && in_array($explicit, self::PROPERTY_TYPES, true)) {
                return $explicit;
            }

            $fromSlug = $this->resolveFromSlug((string) $node->slug);
            if ($fromSlug) {
                return $fromSlug;
            }
        }

        return null;
    }

    private function resolveFromSlug(string $slug): ?string
    {
        if ($slug === '') {
            return null;
        }

        $parts = explode('-', $slug);
        $suffix = end($parts);
        if (! is_string($suffix) || $suffix === '') {
            return null;
        }

        $mapped = self::SLUG_SUFFIX_MAP[strtolower($suffix)] ?? null;
        if ($mapped && in_array($mapped, self::PROPERTY_TYPES, true)) {
            return $mapped;
        }

        return null;
    }
}
