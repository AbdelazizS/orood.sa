<?php

namespace App\Http\Requests;

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

        // Offer: images required; Request: images optional
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
        });
    }
}
