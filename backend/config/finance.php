<?php

return [
    'bank_transfer' => [
        'account_name' => env('FINANCE_BANK_ACCOUNT_NAME', 'Arood Platform'),
        'bank_name' => env('FINANCE_BANK_NAME', 'Arood Bank'),
        'iban' => env('FINANCE_BANK_IBAN', 'SA0000000000000000000000'),
    ],
];
