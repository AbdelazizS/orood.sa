<?php

return [
    /*
    | Company channel videos (stored on the "public" disk under company-videos/{company_id}).
    | max_kb: upload limit in KB (default 200 MB). PHP's upload_max_filesize / post_max_size and
    | nginx client_max_body_size must be at least this large in production.
    */
    'disk' => env('VIDEO_DISK', 'public'),
    'max_kb' => (int) env('VIDEO_MAX_KB', 204800),
    'thumbnail_max_kb' => (int) env('VIDEO_THUMBNAIL_MAX_KB', 5120),
    // A video counts as a "Short" at or below this length (seconds), like YouTube Shorts.
    'short_max_seconds' => (int) env('VIDEO_SHORT_MAX_SECONDS', 90),

    /*
    | Optional "fast start": if ffmpeg is installed, uploaded MP4/MOV files are rewritten with their index
    | at the front (no re-encoding, seconds of CPU) so playback starts before the whole file downloads.
    | Empty = look for "ffmpeg" on the PATH; "off" = never.
    */
    'ffmpeg_path' => env('VIDEO_FFMPEG_PATH', ''),
];
