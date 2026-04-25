<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use Illuminate\Support\Facades\Log;

class LogSmsSender implements SmsSender
{
    public function send(string $toPhone, string $message): void
    {
        Log::info('[SMS stub] Would send SMS', [
            'to' => $toPhone,
            'message' => $message,
        ]);
    }
}
