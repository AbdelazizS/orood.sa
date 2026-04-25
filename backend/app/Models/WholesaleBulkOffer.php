<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class WholesaleBulkOffer extends Model
{
    protected $fillable = [
        'company_id',
        'title',
        'description',
        'discount_percent',
        'min_buyers',
        'valid_until',
        'status',
    ];

    protected $casts = [
        'discount_percent' => 'integer',
        'min_buyers' => 'integer',
        'valid_until' => 'date',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'wholesale_bulk_offer_products', 'bulk_offer_id', 'product_id');
    }
}
