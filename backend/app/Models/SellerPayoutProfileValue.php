<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerPayoutProfileValue extends Model
{
    protected $fillable = [
        'user_id',
        'payment_method_field_id',
        'field_key',
        'value_text',
        'value_json',
        'file_url',
    ];

    protected $casts = [
        'value_json' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fieldDefinition(): BelongsTo
    {
        return $this->belongsTo(PaymentMethodField::class, 'payment_method_field_id');
    }
}
