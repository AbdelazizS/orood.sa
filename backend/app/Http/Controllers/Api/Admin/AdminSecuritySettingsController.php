<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\PasswordPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSecuritySettingsController extends Controller
{
    public function showPasswordPolicy(): JsonResponse
    {
        $payload = PasswordPolicyService::responsePayload();
        $payload['hint'] = PasswordPolicyService::rulesDescription(app()->getLocale());

        return response()->json($payload);
    }

    public function updatePasswordPolicy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', 'in:simple,complex'],
        ]);

        PasswordPolicyService::setMode($validated['mode'], $request->user()?->id);

        $payload = PasswordPolicyService::responsePayload();
        $payload['hint'] = PasswordPolicyService::rulesDescription(app()->getLocale());

        return response()->json([
            'message' => __('auth.password_policy_updated'),
            ...$payload,
        ]);
    }
}

