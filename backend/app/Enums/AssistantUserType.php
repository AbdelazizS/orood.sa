<?php

namespace App\Enums;

enum AssistantUserType: string
{
    case INDIVIDUAL = 'individual';
    case COMPANY = 'company';
    case MARKETER = 'marketer';
    case ADMIN = 'admin';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
