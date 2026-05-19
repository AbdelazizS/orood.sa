<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategorySchemaField extends Model
{
    protected $fillable = [
        'schema_id',
        'section_id',
        'field_key',
        'field_type',
        'label_ar',
        'label_en',
        'placeholder_ar',
        'placeholder_en',
        'help_ar',
        'help_en',
        'required',
        'validation_rules',
        'options',
        'visible_when',
        'config_json',
        'role_restrictions',
        'searchable',
        'filterable',
        'show_on_card',
        'sort_order',
    ];

    protected $casts = [
        'required' => 'boolean',
        'validation_rules' => 'array',
        'options' => 'array',
        'visible_when' => 'array',
        'config_json' => 'array',
        'role_restrictions' => 'array',
        'searchable' => 'boolean',
        'filterable' => 'boolean',
        'show_on_card' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function schema(): BelongsTo
    {
        return $this->belongsTo(CategoryListingSchema::class, 'schema_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(CategorySchemaSection::class, 'section_id');
    }

    public function fieldOptions(): HasMany
    {
        return $this->hasMany(CategoryFieldOption::class, 'field_id')->orderBy('sort_order');
    }

    public function localizedLabel(?string $locale = null): string
    {
        $locale = $locale === 'en' ? 'en' : 'ar';

        if ($locale === 'en' && $this->label_en) {
            return $this->label_en;
        }

        if ($this->label_ar) {
            return $this->label_ar;
        }

        return $this->label_en ?? $this->field_key ?? '';
    }

    public function isLayoutBlock(): bool
    {
        return in_array($this->field_type, ['info', 'divider', 'warning', 'instruction_block'], true);
    }
}
