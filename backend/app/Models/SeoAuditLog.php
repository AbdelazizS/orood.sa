<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoAuditLog extends Model
{
    protected $table = 'seo_audit_logs';

    protected $fillable = [
        'page_url',
        'page_key',
        'issue_type',
        'status',
        'details',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];
}
