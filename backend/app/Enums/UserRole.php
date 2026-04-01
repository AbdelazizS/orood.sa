<?php

namespace App\Enums;

enum UserRole: string
{
    case USER = 'user';
    case SELLER = 'seller';
    case BUYER = 'buyer';
    case MODERATOR = 'moderator';
    case ADMIN = 'admin';
    case SUPERADMIN = 'super_admin';
    case MANAGER = 'manager';
    case EMPLOYEE = 'employee';

    public function isPlatformManager(): bool
    {
        return in_array($this, [
            self::MODERATOR,
            self::ADMIN,
            self::SUPERADMIN,
            self::MANAGER,
            self::EMPLOYEE,
        ], true);
    }

    public function canCreateListings(): bool
    {
        return in_array($this, [
            self::USER,
            self::SELLER,
            self::BUYER,
        ], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::USER => 'مستخدم',
            self::SELLER => 'بائع',
            self::BUYER => 'مشتري',
            self::MODERATOR => 'مشرف',
            self::ADMIN => 'مدير',
            self::SUPERADMIN => 'مدير أعلى',
            self::MANAGER => 'مدير منصة',
            self::EMPLOYEE => 'موظف',
        };
    }
}
