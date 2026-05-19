<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CodPolicy extends Model
{
    public const SCOPE_GLOBAL = 'global';

    public const SCOPE_CATEGORY = 'category';

    public const SCOPE_CITY = 'city';

    public const SCOPE_SELLER = 'seller';

    protected $fillable = [
        'scope',
        'scope_id',
        'enabled',
        'buyer_must_accept',
        'seller_can_toggle',
        'priority',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'buyer_must_accept' => 'boolean',
        'seller_can_toggle' => 'boolean',
    ];
}
