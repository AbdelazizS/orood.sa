<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminSettingsService;
use App\Services\AuditLogService;
use App\Services\PasswordPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    public function __construct(
        private readonly AdminSettingsService $settings,
        private readonly AuditLogService $audit
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->settings->all(),
        ]);
    }

    public function updateSecurity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', 'in:simple,complex'],
        ]);

        $before = $this->settings->all()['security'];
        PasswordPolicyService::setMode($validated['mode'], $request->user()?->id);
        $after = $this->settings->all()['security'];

        $this->audit->log('settings.security.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('auth.password_policy_updated'),
            'data' => $after,
        ]);
    }

    public function updateAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'allow_company_registration' => ['sometimes', 'boolean'],
            'default_user_role' => ['sometimes', 'in:buyer,seller'],
        ]);

        $before = $this->settings->all()['account'];
        $after = $this->settings->updateAccount($validated, $request->user()?->id);
        $this->audit->log('settings.account.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }

    public function updateAuth(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_verification_required' => ['sometimes', 'boolean'],
        ]);

        $before = $this->settings->all()['auth'];
        $after = $this->settings->updateAuth($validated, $request->user()?->id);
        $this->audit->log('settings.auth.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }

    public function updateContent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'listings_auto_publish_on_create' => ['sometimes', 'boolean'],
            'default_bids_visible' => ['sometimes', 'boolean'],
            'default_comments_visible' => ['sometimes', 'boolean'],
        ]);

        $before = $this->settings->all()['content'];
        $after = $this->settings->updateContent($validated, $request->user()?->id);
        $this->audit->log('settings.content.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }
}

