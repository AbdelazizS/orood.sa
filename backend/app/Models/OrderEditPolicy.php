<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderEditPolicy extends Model
{
    protected $fillable = [
        'scope', 'scope_id', 'max_text_edits', 'max_price_edits', 'max_location_edits',
        'edit_window_hours', 'location_edit_window_hours', 'location_edit_until_status',
        'location_edit_active',
        'image_edit_requires_approval', 'price_edit_requires_approval',
        'auto_approve_text_only', 'active', 'meta',
    ];

    protected $casts = [
        'image_edit_requires_approval' => 'boolean',
        'price_edit_requires_approval' => 'boolean',
        'auto_approve_text_only' => 'boolean',
        'active' => 'boolean',
        'location_edit_active' => 'boolean',
        'meta' => 'array',
    ];

    public static function globalPolicy(): self
    {
        return static::query()->firstOrCreate(
            ['scope' => 'global', 'scope_id' => null],
            [
                'max_text_edits' => 2,
                'max_price_edits' => 0,
                'max_location_edits' => 2,
                'edit_window_hours' => 24,
                'location_edit_window_hours' => 24,
                'location_edit_until_status' => 'shipped',
                'location_edit_active' => true,
                'image_edit_requires_approval' => true,
                'price_edit_requires_approval' => true,
                'auto_approve_text_only' => true,
                'active' => true,
            ],
        );
    }
}
