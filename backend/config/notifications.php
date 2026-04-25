<?php

/**
 * Platform notification channels by event (in-app DB, mail, SMS).
 * Legacy ORDERS_NOTIFY_SELLER_* env vars are still read as fallbacks for mail/sms.
 */
return [
    'events' => [
        'purchase_new_seller' => [
            'database' => (bool) env('NOTIFICATIONS_PURCHASE_NEW_SELLER_DATABASE', true),
            'mail' => (bool) env(
                'NOTIFICATIONS_PURCHASE_NEW_SELLER_MAIL',
                env('ORDERS_NOTIFY_SELLER_EMAIL', false)
            ),
            'sms' => (bool) env(
                'NOTIFICATIONS_PURCHASE_NEW_SELLER_SMS',
                env('ORDERS_NOTIFY_SELLER_SMS', false)
            ),
        ],
    ],
];
