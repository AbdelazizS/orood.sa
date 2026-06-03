<?php

namespace App\Support;

use Carbon\Carbon;
use DateTimeInterface;

final class DateTimeFormat
{
    public static function toIso8601(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format(DateTimeInterface::ATOM);
        }

        if (is_string($value)) {
            try {
                return Carbon::parse($value)->format(DateTimeInterface::ATOM);
            } catch (\Throwable) {
                return $value;
            }
        }

        return null;
    }
}
