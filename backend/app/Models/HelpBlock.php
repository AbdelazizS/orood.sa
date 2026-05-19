<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HelpBlock extends Model
{
    protected $fillable = ['page_key', 'block_type', 'config_json', 'sort_order', 'visible'];

    protected $casts = [
        'config_json' => 'array',
        'visible' => 'boolean',
    ];
}
