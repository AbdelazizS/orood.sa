<?php

namespace App\Services\Finance;

class PhoneNormalizationService
{
    public function normalize(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);
        if ($digits === null || $digits === '') {
            return null;
        }

        if (str_starts_with($digits, '966')) {
            $digits = substr($digits, 3);
        }
        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) === 9 && str_starts_with($digits, '5')) {
            return '0'.$digits;
        }

        if (strlen($digits) === 10 && str_starts_with($digits, '05')) {
            return $digits;
        }

        return null;
    }

    public function isValidSaudiMobile(?string $phone): bool
    {
        $normalized = $this->normalize($phone);

        return $normalized !== null && (bool) preg_match('/^05\d{8}$/', $normalized);
    }
}
