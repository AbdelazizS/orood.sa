<?php

namespace App\Services;

use App\Models\AppSetting;

class PasswordPolicyService
{
    private const SETTING_KEY = 'security.password_policy_mode';

    public const MODE_SIMPLE = 'simple';
    public const MODE_COMPLEX = 'complex';

    public static function mode(): string
    {
        $stored = AppSetting::getValue(self::SETTING_KEY);
        $mode = is_string($stored) ? $stored : null;
        if (! in_array($mode, [self::MODE_SIMPLE, self::MODE_COMPLEX], true)) {
            $mode = config('security.password_policy_mode', self::MODE_SIMPLE);
        }

        return in_array($mode, [self::MODE_SIMPLE, self::MODE_COMPLEX], true)
            ? $mode
            : self::MODE_SIMPLE;
    }

    public static function setMode(string $mode, ?int $updatedBy = null): void
    {
        AppSetting::putValue(self::SETTING_KEY, $mode, $updatedBy);
    }

    public static function registerRules(): array
    {
        return self::rulesForField('password');
    }

    public static function rulesForField(string $field): array
    {
        $mode = self::mode();
        $rules = ['required', 'string', 'confirmed'];

        if ($mode === self::MODE_COMPLEX) {
            return [
                ...$rules,
                'min:8',
                // At least one upper, lower, number, and special char
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/',
            ];
        }

        return [
            ...$rules,
            'min:6',
            // At least one letter and one number
            'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/',
        ];
    }

    public static function rulesDescription(string $locale): string
    {
        $key = self::mode() === self::MODE_COMPLEX
            ? 'auth.validation.password_rule_complex'
            : 'auth.validation.password_rule_simple';

        return __($key, locale: $locale);
    }

    public static function responsePayload(): array
    {
        $mode = self::mode();

        return [
            'mode' => $mode,
            'min_length' => $mode === self::MODE_COMPLEX ? 8 : 6,
            'requires' => $mode === self::MODE_COMPLEX
                ? ['uppercase', 'lowercase', 'number', 'special']
                : ['letter', 'number'],
        ];
    }
}

