<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialRequestValue extends Model
{
    protected $fillable = [
        'financial_request_id',
        'field_key',
        'value_text',
        'value_json',
        'file_url',
    ];

    protected $casts = [
        'value_json' => 'array',
    ];

    public function financialRequest(): BelongsTo
    {
        return $this->belongsTo(FinancialRequest::class);
    }
}
