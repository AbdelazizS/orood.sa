<?php

return [
    /*
    | Subscriber ad packages.
    | ad_days: how long a bought ad stays active before it expires (the listing goes back to "awaiting a marketer").
    | ad_price_sar: default price of one ad, used when the admin doesn't enter the amount paid.
    */
    'ad_days' => (int) env('SUBSCRIBER_AD_DAYS', 30),
    'ad_price_sar' => (float) env('SUBSCRIBER_AD_PRICE_SAR', 100),
];
