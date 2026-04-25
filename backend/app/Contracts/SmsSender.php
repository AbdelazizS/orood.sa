<?php

namespace App\Contracts;

interface SmsSender
{
    public function send(string $toPhone, string $message): void;
}
