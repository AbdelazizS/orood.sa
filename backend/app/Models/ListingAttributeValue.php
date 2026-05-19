<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListingAttributeValue extends Model
{
    protected $fillable = [
        'product_id',
        'category_field_definition_id',
        'category_schema_field_id',
        'value_text',
        'value_json',
    ];

    protected $casts = [
        'value_json' => 'array',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(CategoryFieldDefinition::class, 'category_field_definition_id');
    }

    public function schemaField(): BelongsTo
    {
        return $this->belongsTo(CategorySchemaField::class, 'category_schema_field_id');
    }
}
