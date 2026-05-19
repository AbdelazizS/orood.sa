<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductRealEstateDetail;

class ProductRealEstateService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function sync(Product $product, array $payload): ?ProductRealEstateDetail
    {
        if ($payload === [] || ! isset($payload['purpose'], $payload['property_type'])) {
            $product->realEstateDetail?->delete();

            return null;
        }

        return $product->realEstateDetail()->updateOrCreate(
            ['product_id' => $product->id],
            [
                'purpose' => $payload['purpose'],
                'property_type' => $payload['property_type'],
                'area_sqm' => $payload['area_sqm'] ?? null,
                'bedrooms' => $payload['bedrooms'] ?? null,
                'bathrooms' => $payload['bathrooms'] ?? null,
                'land_width_m' => $payload['land_width_m'] ?? null,
                'land_length_m' => $payload['land_length_m'] ?? null,
                'street_width_m' => $payload['street_width_m'] ?? null,
                'property_age_years' => $payload['property_age_years'] ?? null,
                'furnished' => (bool) ($payload['furnished'] ?? false),
                'floor_number' => $payload['floor_number'] ?? null,
                'total_floors' => $payload['total_floors'] ?? null,
                'amenities' => $payload['amenities'] ?? null,
            ]
        );
    }
}
