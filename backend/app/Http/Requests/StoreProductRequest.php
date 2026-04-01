<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'image_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/)/'],
            'image_urls' => ['nullable', 'array'],
            'image_urls.*' => ['string', 'max:500', 'regex:/^(https?:\/\/|\/)/'],
            'accept_bids' => ['nullable', 'boolean'],
            'bids_visible' => ['nullable', 'boolean'],
            'free_shipping' => ['nullable', 'boolean'],
            'free_return' => ['nullable', 'boolean'],
            'return_days' => ['nullable', 'string', 'max:20'],
            'view_at_client' => ['nullable', 'boolean'],
            'contact_phone' => ['nullable', 'boolean'],
            'contact_messages' => ['nullable', 'boolean'],
            'contact_phone_number' => ['nullable', 'string', 'max:50'],
            'contact_preferences' => ['nullable', 'array'],
            'shipping_details' => ['nullable', 'array'],
        ];

        // Offer: images required; Request: images optional
        if ($type === 'offer') {
            $rules['image_urls'] = ['required', 'array', 'min:1'];
        }

        return $rules;
    }
}
