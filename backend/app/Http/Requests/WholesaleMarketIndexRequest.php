<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WholesaleMarketIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sort' => ['sometimes', 'string', 'in:newest,price_asc,price_desc,discount,popular'],
            'search' => ['sometimes', 'string', 'max:200'],
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'subcategory_id' => ['sometimes', 'integer', 'min:1'],
            'city_id' => ['sometimes', 'integer', 'min:1'],
            'region_id' => ['sometimes', 'integer', 'min:1'],
            'price_min' => ['sometimes', 'numeric', 'min:0'],
            'price_max' => ['sometimes', 'numeric', 'min:0'],
            'condition' => ['sometimes', 'string', 'max:32'],
            'min_discount' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'min_buyers' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'group_status' => ['sometimes', 'string', 'in:open,almost_full'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:60'],
        ];
    }
}
