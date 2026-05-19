<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\Subcategory;
use App\Services\Listings\ListingSchemaService;
use App\Services\Listings\ListingSchemaValidator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $type = $this->input('type', 'offer');

        $rules = [
            'type' => ['required', 'string', Rule::in(['offer', 'request'])],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'min_quantity' => ['nullable', 'integer', 'min:1'],
            'is_wholesale' => ['nullable', 'boolean'],
            'condition' => ['nullable', 'string', Rule::in(['new', 'used'])],
            'warranty' => ['nullable', 'string', 'max:50'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'integer', 'exists:subcategories,id'],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'location_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'location_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'location_address' => ['nullable', 'string', 'max:500'],
            'listing_attributes' => ['nullable', 'array'],
            'real_estate' => ['nullable', 'array'],
            'real_estate.purpose' => ['nullable', 'string', Rule::in(['sale', 'rent'])],
            'real_estate.property_type' => ['nullable', 'string', Rule::in(['apartment', 'villa', 'land', 'building', 'floor', 'shop', 'farm'])],
            'real_estate.area_sqm' => ['nullable', 'numeric', 'min:1'],
            'real_estate.bedrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'real_estate.bathrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'real_estate.land_width_m' => ['nullable', 'numeric', 'min:0'],
            'real_estate.land_length_m' => ['nullable', 'numeric', 'min:0'],
            'real_estate.street_width_m' => ['nullable', 'numeric', 'min:0'],
            'real_estate.property_age_years' => ['nullable', 'integer', 'min:0', 'max:200'],
            'real_estate.furnished' => ['nullable', 'boolean'],
            'real_estate.floor_number' => ['nullable', 'integer', 'min:0', 'max:200'],
            'real_estate.total_floors' => ['nullable', 'integer', 'min:0', 'max:200'],
            'real_estate.amenities' => ['nullable', 'array'],
            'real_estate.amenities.*' => ['string', 'max:64'],
            'image_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/)/'],
            'image_urls' => ['nullable', 'array'],
            'image_urls.*' => ['string', 'max:500', 'regex:/^(https?:\/\/|\/)/'],
            'accept_bids' => ['nullable', 'boolean'],
            'bids_visible' => ['nullable', 'boolean'],
            'show_comments' => ['nullable', 'boolean'],
            'free_shipping' => ['nullable', 'boolean'],
            'free_return' => ['nullable', 'boolean'],
            'return_days' => ['nullable', 'string', 'max:20'],
            'view_at_client' => ['nullable', 'boolean'],
            'contact_phone' => ['nullable', 'boolean'],
            'contact_messages' => ['nullable', 'boolean'],
            'contact_phone_number' => ['nullable', 'string', 'max:50', 'regex:/^05\d{8}$/'],
            'contact_preferences' => ['nullable', 'array'],
            'shipping_details' => ['nullable', 'array'],
        ];

        if ($type === 'offer') {
            $rules['image_urls'] = ['required', 'array', 'min:1'];
        }

        return $rules;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $contactPhone = filter_var($this->input('contact_phone', false), FILTER_VALIDATE_BOOLEAN);
            $contactMessages = filter_var($this->input('contact_messages', false), FILTER_VALIDATE_BOOLEAN);

            if (! $contactPhone && ! $contactMessages) {
                $validator->errors()->add('contact_phone', 'At least one contact method must be selected.');
            }

            $phoneNumber = (string) $this->input('contact_phone_number', '');
            if ($contactPhone && trim($phoneNumber) === '') {
                $validator->errors()->add('contact_phone_number', 'Phone number is required when call contact is enabled.');
            }

            $isWholesale = filter_var($this->input('is_wholesale', false), FILTER_VALIDATE_BOOLEAN);
            if ($isWholesale) {
                if ($this->input('wholesale_price') === null) {
                    $validator->errors()->add('wholesale_price', 'Wholesale price is required for wholesale listings.');
                }
                if ($this->input('min_quantity') === null) {
                    $validator->errors()->add('min_quantity', 'Minimum quantity is required for wholesale listings.');
                }
            }

            if ($this->usesDynamicListingSchema()) {
                $category = Category::query()->find((int) $this->input('category_id'));
                $schemaService = app(ListingSchemaService::class);
                $schema = $schemaService->resolvePublishedSchema(
                    (int) $this->input('category_id'),
                    $this->input('subcategory_id') ? (int) $this->input('subcategory_id') : null,
                    $this->input('type', 'offer')
                );
                if ($schema) {
                    $serialized = $schemaService->serializeForApi($schema);
                    try {
                        app(ListingSchemaValidator::class)->validatePolicies($serialized['policies'], [
                            'location_lat' => $this->input('location_lat'),
                            'location_lng' => $this->input('location_lng'),
                            'city_id' => $this->input('city_id'),
                            'image_urls' => $this->input('image_urls', []),
                        ]);
                        if (is_array($this->input('listing_attributes'))) {
                            app(ListingSchemaValidator::class)->validate(
                                $schema,
                                $this->input('listing_attributes', [])
                            );
                        }
                    } catch (\Illuminate\Validation\ValidationException $e) {
                        foreach ($e->errors() as $key => $messages) {
                            $errorKey = str_starts_with($key, 'listing_attributes.')
                                ? $key
                                : 'listing_attributes.'.$key;
                            foreach ($messages as $message) {
                                $validator->errors()->add($errorKey, $message);
                            }
                        }
                    }
                }
            } elseif (! $this->usesDynamicListingSchema() && $this->isRealEstateListingSelection()) {
                if ($this->input('location_lat') === null || $this->input('location_lng') === null) {
                    $validator->errors()->add('location_lat', 'Property map location is required for real estate listings.');
                }
                $re = $this->input('real_estate', []);
                if (empty($re['purpose'])) {
                    $validator->errors()->add('real_estate.purpose', 'Purpose (sale or rent) is required for real estate listings.');
                }
                if (empty($re['property_type'])) {
                    $validator->errors()->add('real_estate.property_type', 'Property type is required for real estate listings.');
                }
                $type = $re['property_type'] ?? '';
                if ($type !== 'land' && empty($re['area_sqm'])) {
                    $validator->errors()->add('real_estate.area_sqm', 'Area is required for this property type.');
                }
                if ($type === 'land') {
                    if (empty($re['land_width_m']) || empty($re['land_length_m'])) {
                        $validator->errors()->add('real_estate.land_width_m', 'Land dimensions are required for land listings.');
                    }
                }
            }
        });
    }

    public function usesDynamicListingSchema(): bool
    {
        $categoryId = (int) $this->input('category_id');
        if ($categoryId <= 0) {
            return false;
        }
        $category = Category::query()->find($categoryId);

        return $category && app(ListingSchemaService::class)->isDynamicSchemaEnabled($category);
    }

    public function isRealEstateListingSelection(): bool
    {
        $slugs = config('listings.real_estate_category_slugs', ['real-estate']);

        $categoryId = (int) $this->input('category_id');
        if ($categoryId > 0) {
            $category = Category::query()->find($categoryId);
            if ($category && in_array($category->slug, $slugs, true)) {
                return true;
            }
        }

        $subcategoryId = (int) $this->input('subcategory_id');
        if ($subcategoryId > 0) {
            $parentSlug = Subcategory::query()->with('category')->find($subcategoryId)?->category?->slug;
            if ($parentSlug && in_array($parentSlug, $slugs, true)) {
                return true;
            }
        }

        return false;
    }
}
