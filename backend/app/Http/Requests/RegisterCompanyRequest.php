<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'city_id' => ['required', 'exists:cities,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'product_types' => ['nullable', 'string', 'max:255'],
            'activities' => ['nullable', 'array'],
            'activities.*' => ['string', 'in:marketer,developer,seller'],
            'fal_license_no' => ['nullable', 'string', 'max:50', 'regex:/^[0-9A-Za-z\-]+$/'],
            'license' => ['nullable', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:5120'],
        ];
    }
}
