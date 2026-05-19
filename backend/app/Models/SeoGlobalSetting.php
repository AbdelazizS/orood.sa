<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoGlobalSetting extends Model
{
    protected $fillable = ['setting_key', 'setting_value'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $row = static::query()->where('setting_key', $key)->first();
        if (! $row || $row->setting_value === null) {
            return $default;
        }

        $decoded = json_decode($row->setting_value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return $row->setting_value;
    }

    public static function setValue(string $key, mixed $value): void
    {
        $stored = is_array($value) || is_object($value)
            ? json_encode($value, JSON_UNESCAPED_UNICODE)
            : (string) $value;

        static::query()->updateOrCreate(
            ['setting_key' => $key],
            ['setting_value' => $stored]
        );
    }
}
