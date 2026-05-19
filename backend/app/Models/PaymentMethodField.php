<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentMethodField extends Model
{
    protected $fillable = [
        'payment_method_id',
        'context',
        'field_key',
        'field_type',
        'label_ar',
        'label_en',
        'placeholder_ar',
        'placeholder_en',
        'help_ar',
        'help_en',
        'required',
        'sort_order',
        'validation_rules',
        'options',
        'visible_when',
        'config_json',
        'is_layout_block',
        'block_style',
    ];

    protected $casts = [
        'required' => 'boolean',
        'validation_rules' => 'array',
        'options' => 'array',
        'visible_when' => 'array',
        'config_json' => 'array',
        'is_layout_block' => 'boolean',
    ];

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function localizedLabel(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return $locale === 'en' && $this->label_en
            ? $this->label_en
            : $this->label_ar;
    }
}
