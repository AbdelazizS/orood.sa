<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class AppSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'updated_by',
    ];

    protected $casts = [
        'value' => 'array',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        // SQLite/dev boot safety: allow app to run before migrations.
        if (! Schema::hasTable('app_settings')) {
            return $default;
        }

        $setting = static::query()->where('key', $key)->first();
        if (! $setting) {
            return $default;
        }

        return $setting->value ?? $default;
    }

    public static function putValue(string $key, mixed $value, ?int $updatedBy = null): void
    {
        // No-op if settings table is not migrated yet.
        if (! Schema::hasTable('app_settings')) {
            return;
        }

        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'updated_by' => $updatedBy]
        );
    }
}

