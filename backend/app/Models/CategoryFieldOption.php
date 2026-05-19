<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryFieldOption extends Model
{
    protected $fillable = [
        'field_id',
        'value',
        'label_ar',
        'label_en',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(CategorySchemaField::class, 'field_id');
    }

    public function localizedLabel(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return $locale === 'en' && $this->label_en
            ? $this->label_en
            : $this->label_ar;
    }
}
