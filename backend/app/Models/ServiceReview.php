<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceReview extends Model
{
    protected $fillable = [
        'service_provider_id',
        'user_id',
        'service_request_id',
        'rating',
        'comment',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class, 'service_provider_id');
    }
}
