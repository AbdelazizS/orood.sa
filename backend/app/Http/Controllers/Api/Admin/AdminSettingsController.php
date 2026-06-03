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

    public function updateWholesaleMarketPage(Request $request): JsonResponse
    {
        $rules = [
            'show_hero' => ['sometimes', 'boolean'],
            'show_quick_filters' => ['sometimes', 'boolean'],
            'show_how_it_works' => ['sometimes', 'boolean'],
            'show_trust' => ['sometimes', 'boolean'],
            'copy' => ['sometimes', 'array'],
            'copy.ar' => ['sometimes', 'array'],
            'copy.en' => ['sometimes', 'array'],
        ];
        foreach (AdminSettingsService::wholesaleCopyFieldKeys() as $field) {
            $rules['copy.ar.'.$field] = ['sometimes', 'nullable', 'string', 'max:2000'];
            $rules['copy.en.'.$field] = ['sometimes', 'nullable', 'string', 'max:2000'];
        }

        $validated = $request->validate($rules);

        $before = $this->settings->wholesaleMarketPage();
        $after = $this->settings->updateWholesaleMarketPage($validated, $request->user()?->id);
        $this->audit->log('settings.wholesale_market_page.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }

    public function updatePayments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'finance_modules' => ['sometimes', 'array'],
            'finance_modules.payments_module' => ['sometimes', 'boolean'],
            'finance_modules.escrow' => ['sometimes', 'boolean'],
            'finance_modules.financial_guarantee' => ['sometimes', 'boolean'],
            'finance_modules.bank_accounts' => ['sometimes', 'boolean'],
            'finance_modules.cod' => ['sometimes', 'boolean'],
            'finance_modules.wallet' => ['sometimes', 'boolean'],
            'payment_methods' => ['sometimes', 'array'],
            'payment_methods.*.id' => ['required', 'integer', 'exists:payment_methods,id'],
            'payment_methods.*.enabled' => ['sometimes', 'boolean'],
            'payment_methods.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'payment_methods.*.instructions' => ['sometimes', 'nullable', 'array'],
            'payment_methods.*.name_ar' => ['sometimes', 'string', 'max:255'],
            'payment_methods.*.name_en' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cod_global' => ['sometimes', 'array'],
            'cod_global.enabled' => ['sometimes', 'boolean'],
            'cod_global.buyer_must_accept' => ['sometimes', 'boolean'],
            'cod_global.seller_can_toggle' => ['sometimes', 'boolean'],
        ]);

        $before = $this->settings->paymentsSummary();
        $after = $this->settings->updatePayments($validated, $request->user()?->id);
        $this->audit->log('settings.payments.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }

    public function updateContact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hero_kicker_ar' => ['sometimes', 'string', 'max:255'],
            'hero_kicker_en' => ['sometimes', 'string', 'max:255'],
            'hero_title_ar' => ['sometimes', 'string', 'max:255'],
            'hero_title_en' => ['sometimes', 'string', 'max:255'],
            'hero_subtitle_ar' => ['sometimes', 'string', 'max:2000'],
            'hero_subtitle_en' => ['sometimes', 'string', 'max:2000'],
            'response_time_ar' => ['sometimes', 'nullable', 'string', 'max:500'],
            'response_time_en' => ['sometimes', 'nullable', 'string', 'max:500'],
            'hours_ar' => ['sometimes', 'nullable', 'string', 'max:500'],
            'hours_en' => ['sometimes', 'nullable', 'string', 'max:500'],
            'form_enabled' => ['sometimes', 'boolean'],
            'trust_indicators' => ['sometimes', 'array', 'max:10'],
            'channels' => ['sometimes', 'array', 'max:20'],
            'inquiry_types' => ['sometimes', 'array', 'max:30'],
            'form_fields' => ['sometimes', 'array', 'max:30'],
            'faq' => ['sometimes', 'array'],
            'trust_blocks' => ['sometimes', 'array', 'max:12'],
            'success_message_ar' => ['sometimes', 'string', 'max:500'],
            'success_message_en' => ['sometimes', 'string', 'max:500'],
            'notify_emails' => ['sometimes', 'array'],
            'notify_emails.*' => ['email'],
        ]);

        $before = $this->settings->contactPage();
        $after = $this->settings->updateContactPage($validated, $request->user()?->id);
        $this->audit->log('settings.contact.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }
}
