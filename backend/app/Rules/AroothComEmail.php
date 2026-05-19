<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AroothComEmail implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $email = strtolower(trim((string) $value));

        if (! str_ends_with($email, '@arooth.com')) {
            $fail(__('auth.validation.arooth_com_email'));
        }
    }
}
