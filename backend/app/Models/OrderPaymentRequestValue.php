<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderPaymentRequestValue extends Model
{
    protected $fillable = [
        'order_payment_request_id',
        'field_key',
        'value_text',
        'value_json',
        'file_url',
    ];

    protected $casts = [
        'value_json' => 'array',
    ];

    public function orderPaymentRequest(): BelongsTo
    {
        return $this->belongsTo(OrderPaymentRequest::class);
    }
}
