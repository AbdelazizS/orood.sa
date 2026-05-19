<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportSetting extends Model
{
    protected $fillable = [
        'support_email', 'whatsapp', 'telegram', 'phone',
        'hours_ar', 'hours_en', 'emergency_notice_ar', 'emergency_notice_en',
        'meta', 'updated_by',
    ];

    protected $casts = ['meta' => 'array'];
}
