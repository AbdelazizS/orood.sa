<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportContact extends Model
{
    protected $fillable = ['type', 'label_ar', 'label_en', 'value', 'visible', 'sort_order'];

    protected $casts = ['visible' => 'boolean'];
}
