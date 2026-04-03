<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminAnnouncement extends Model
{
    protected $fillable = [
        'title',
        'message',
        'type',
        'target',
        'active',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public const TYPE_INFO = 'info';
    public const TYPE_WARNING = 'warning';
    public const TYPE_ALERT = 'alert';

    public const TARGET_ALL = 'all';
    public const TARGET_INDIVIDUALS = 'individuals';
    public const TARGET_COMPANIES = 'companies';
    public const TARGET_TEAM = 'team';

    public function scopeActive($query)
    {
        return $query->where('active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }
}
