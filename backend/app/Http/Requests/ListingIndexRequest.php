<?php

namespace App\Http\Requests;

class ListingIndexRequest extends FeedRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'type' => 'nullable|in:offer,request',
            'sort' => 'nullable|in:latest,most-sold,cheapest,most-viewed',
            'per_page' => 'nullable|integer|min:1|max:50',
            'purpose' => 'nullable|in:sale,rent',
            'property_type' => 'nullable|in:apartment,villa,land,building,floor,shop,farm',
            'min_area' => 'nullable|numeric|min:0',
            'max_area' => 'nullable|numeric|min:0',
            'bedrooms_min' => 'nullable|integer|min:0|max:50',
        ]);
    }

    public function validatedFilters(): array
    {
        $filters = parent::validatedFilters();
        $type = data_get($filters, 'type');
        $sort = data_get($filters, 'sort');

        if ($type === 'offer') {
            $filters['filter'] = 'offers';
        } elseif ($type === 'request') {
            $filters['filter'] = 'requests';
        }

        if ($sort === 'most-sold') {
            $filters['filter'] = 'most-sold';
        } elseif ($sort === 'cheapest') {
            $filters['filter'] = 'cheapest';
        } elseif ($sort === 'most-viewed') {
            $filters['filter'] = 'most-viewed';
        } elseif ($sort === 'latest') {
            $filters['filter'] = 'all';
        }

        return $filters;
    }
}
