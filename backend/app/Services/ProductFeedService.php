<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProductFeedService
{
    public function __construct(private Product $product)
    {
    }

    public function paginatedFeed(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = $this->product
            ->query()
            ->with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->published()
            ->approved()
            ->filterByRequest($filters);

        $hasOrderFilter = in_array(data_get($filters, 'filter'), ['most-sold', 'cheapest', 'most-viewed'], true);
        if (!$hasOrderFilter) {
            $query->orderByDesc('published_at');
        }

        return $query->paginate($perPage);
    }

    public function filterStats(): array
    {
        return [
            'most_sold' => $this->product->orderByDesc('stats->purchases')->published()->limit(5)->get(['id', 'title', 'stats']),
            'cheapest' => $this->product->orderBy('price')->published()->limit(5)->get(['id', 'title', 'price']),
            'most_viewed' => $this->product->orderByDesc('stats->views')->published()->limit(5)->get(['id', 'title', 'stats']),
            'online' => $this->product->where('contact_preferences->online', true)->published()->limit(5)->get(['id', 'title']),
        ];
    }
}
