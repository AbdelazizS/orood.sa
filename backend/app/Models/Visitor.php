<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visitor extends Model
{
    protected $fillable = [
        'session_id',
        'path',
        'ip',
        'user_agent',
        'city',
        'country',
        'source',
        'first_touch_source',
        'last_touch_source',
        'utm_medium',
        'utm_campaign',
        'referrer_host',
        'referrer_path',
        'social_channel',
        'user_id',
        'first_touch_marketer_id',
        'last_touch_marketer_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
