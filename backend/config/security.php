<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Password Policy Mode
    |--------------------------------------------------------------------------
    |
    | simple  => min 6 + letters and numbers
    | complex => min 8 + upper/lower/number/special
    |
    */
    'password_policy_mode' => env('PASSWORD_POLICY_MODE', 'simple'),
];

