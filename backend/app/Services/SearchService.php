<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;

class SearchService
{
    public function __construct(private Product $product)
    {
    }

    public function autocomplete(string $query): Collection
    {
        if (blank($query)) {
            return collect();
        }

        return $this->product
            ->select(['id', 'title', 'type', 'slug'])
            ->published()
            ->approved()
            ->where(function ($builder) use ($query) {
                $builder->where('title', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%");
            })
            ->limit(10)
            ->get();
    }
}
