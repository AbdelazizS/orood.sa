<?php

return [
    /*
    | When false, platform admins (admin / super_admin) cannot create wholesale reservations.
    | Set WHOLESALE_ADMIN_RESERVE=false in production if staff accounts should not reserve as buyers.
    | For QA wholesale flows, use a dedicated buyer test account.
    */
    'admin_reserve_enabled' => filter_var(env('WHOLESALE_ADMIN_RESERVE', true), FILTER_VALIDATE_BOOLEAN),
];
