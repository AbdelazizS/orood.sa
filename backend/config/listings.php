<?php

$autoPublishEnv = env('LISTINGS_AUTO_PUBLISH_ON_CREATE');

return [
    /*
    | When true, new listings are created as published and appear in the public feed
    | immediately (subject to moderation_status matching the feed's approved scope).
    */
    'auto_publish_on_create' => $autoPublishEnv === null
        ? true
        : filter_var($autoPublishEnv, FILTER_VALIDATE_BOOLEAN),
];
