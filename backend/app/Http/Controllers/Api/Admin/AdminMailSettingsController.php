<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class AdminMailSettingsController extends Controller
{
    public function __construct(private readonly AdminSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->settings->getMailSettings(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mailer' => ['sometimes', 'string', 'max:32'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['nullable', 'string', 'in:tls,ssl,null'],
            'from_address' => ['nullable', 'email', 'max:255'],
            'from_name' => ['nullable', 'string', 'max:255'],
        ]);

        $this->settings->updateMailSettings($validated);

        return response()->json([
            'message' => __('settings.mail_saved'),
            'data' => $this->settings->getMailSettings(),
        ]);
    }

    public function sendTest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => ['required', 'email'],
        ]);

        Mail::raw(__('settings.mail_test_body'), function ($message) use ($validated) {
            $message->to($validated['to'])
                ->subject(__('settings.mail_test_subject'));
        });

        return response()->json(['message' => __('settings.mail_test_sent')]);
    }
}
