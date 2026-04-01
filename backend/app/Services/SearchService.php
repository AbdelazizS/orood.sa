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
            ->where(function ($builder) use ($query) {
                $builder->where('title', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%");
            })
            ->limit(10)
            ->get();
    }
}
<?php

namespace App\Services;

use App\Models\Listing;
use Illuminate\Support\Collection;

class SearchService
{
    public function autocomplete(string $query): Collection
    {
        if (blank($query)) {
            return collect();
        }

        return Listing::query()
            ->select(['id', 'title', 'type', 'slug'])
            ->search($query)
            ->limit(10)
            ->get();
    }
}
