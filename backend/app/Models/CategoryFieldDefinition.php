<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryFieldDefinition extends Model
{
    protected $fillable = [
        'category_id',
        'subcategory_id',
        'field_key',
        'field_type',
        'label_ar',
        'label_en',
        'validation_rules',
        'options',
        'filterable',
        'show_on_card',
        'sort_order',
    ];

    protected $casts = [
        'validation_rules' => 'array',
        'options' => 'array',
        'filterable' => 'boolean',
        'show_on_card' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class);
    }
}
