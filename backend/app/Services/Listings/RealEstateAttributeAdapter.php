<?php

namespace App\Services\Listings;

/**
 * Maps schema listing_attributes to product_real_estate_details payload for backward compatibility.
 */
class RealEstateAttributeAdapter
{
    private const MAP = [
        'purpose' => 'purpose',
        'property_type' => 'property_type',
        'area_sqm' => 'area_sqm',
        'bedrooms' => 'bedrooms',
        'bathrooms' => 'bathrooms',
        'land_width_m' => 'land_width_m',
        'land_length_m' => 'land_length_m',
        'street_width_m' => 'street_width_m',
        'property_age_years' => 'property_age_years',
        'property_direction' => 'property_direction',
        'furnished' => 'furnished',
        'floor_number' => 'floor_number',
        'total_floors' => 'total_floors',
        'amenities' => 'amenities',
    ];

    /** @var list<string> */
    private const AMENITY_SWITCH_KEYS = [
        'parking',
        'elevator',
        'pool',
        'garden',
        'internet',
        'electricity',
        'water',
        'kitchen',
        'air_conditioning',
        'security',
    ];

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public function toRealEstatePayload(array $attributes): array
    {
        $payload = [];
        foreach (self::MAP as $from => $to) {
            if ($from === 'amenities') {
                continue;
            }
            if (! array_key_exists($from, $attributes)) {
                continue;
            }
            $value = $attributes[$from];
            if ($value === null || $value === '') {
                continue;
            }
            if ($to === 'furnished') {
                $payload[$to] = filter_var($value, FILTER_VALIDATE_BOOLEAN);
            } else {
                $payload[$to] = $value;
            }
        }

        $amenities = $this->amenitiesFromAttributes($attributes);
        if ($amenities !== []) {
            $payload['amenities'] = $amenities;
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return list<string>
     */
    public function amenitiesFromAttributes(array $attributes): array
    {
        if (isset($attributes['amenities']) && is_array($attributes['amenities'])) {
            return array_values(array_filter(array_map('strval', $attributes['amenities'])));
        }

        $out = [];
        foreach (self::AMENITY_SWITCH_KEYS as $key) {
            if (! empty($attributes[$key]) && filter_var($attributes[$key], FILTER_VALIDATE_BOOLEAN)) {
                $out[] = $key;
            }
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function fromRealEstateDetail(?object $detail): array
    {
        if (! $detail) {
            return [];
        }

        $out = [];
        foreach (self::MAP as $key => $col) {
            if ($key === 'amenities') {
                continue;
            }
            $val = $detail->{$col} ?? null;
            if ($val !== null && $val !== '') {
                $out[$key] = $val;
            }
        }

        $amenities = $detail->amenities ?? null;
        if (is_array($amenities)) {
            foreach ($amenities as $amenity) {
                $k = is_string($amenity) ? $amenity : null;
                if ($k && in_array($k, self::AMENITY_SWITCH_KEYS, true)) {
                    $out[$k] = true;
                }
            }
        }

        return $out;
    }
}
