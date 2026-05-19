<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\BrandingSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminBrandingController extends Controller
{
    public function __construct(
        private readonly BrandingSettingsService $branding,
        private readonly AuditLogService $audit
    ) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->branding->get(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assets' => ['sometimes', 'array'],
            'assets.logo_light' => ['nullable', 'string', 'max:500'],
            'assets.logo_dark' => ['nullable', 'string', 'max:500'],
            'assets.logo_footer' => ['nullable', 'string', 'max:500'],
            'assets.logo_preloader_mark' => ['nullable', 'string', 'max:500'],
            'assets.favicon' => ['nullable', 'string', 'max:500'],
            'assets.app_icon' => ['nullable', 'string', 'max:500'],
            'placements' => ['sometimes', 'array'],
            'placements.navbar' => ['sometimes', 'array'],
            'placements.sidebar' => ['sometimes', 'array'],
            'placements.footer' => ['sometimes', 'array'],
            'placements.preloader' => ['sometimes', 'array'],
            'placements.auth' => ['sometimes', 'array'],
            'placements.mobile_nav' => ['sometimes', 'array'],
            'legal' => ['sometimes', 'array'],
            'legal.copyright_ar' => ['sometimes', 'string', 'max:500'],
            'legal.copyright_en' => ['sometimes', 'string', 'max:500'],
            'footer' => ['sometimes', 'array'],
            'footer.show_developer_credit' => ['sometimes', 'boolean'],
            'footer.developer_name_ar' => ['sometimes', 'string', 'max:120'],
            'footer.developer_name_en' => ['sometimes', 'string', 'max:120'],
            'footer.developer_linkedin_url' => ['sometimes', 'nullable', 'string', 'max:500', 'regex:/^https:\/\//i'],
            'footer.footer_tagline_ar' => ['sometimes', 'string', 'max:300'],
            'footer.footer_tagline_en' => ['sometimes', 'string', 'max:300'],
            'footer.violation_notice_ar' => ['sometimes', 'string', 'max:500'],
            'footer.violation_notice_en' => ['sometimes', 'string', 'max:500'],
            'transparent_background' => ['sometimes', 'boolean'],
            'preserve_aspect_ratio' => ['sometimes', 'boolean'],
            'reset_defaults' => ['sometimes', 'boolean'],
        ]);

        $before = $this->branding->get();
        $after = $this->branding->update($validated, $request->user()?->id);

        $this->audit->log('settings.branding.update', null, $before, $after, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $after,
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:2048',
                Rule::file()->types(['png', 'svg', 'webp', 'jpg', 'jpeg']),
            ],
            'asset_key' => ['required', 'string', Rule::in(BrandingSettingsService::ASSET_KEYS)],
        ]);

        $result = $this->branding->storeUpload($validated['file'], $validated['asset_key']);

        $this->audit->log('settings.branding.upload', null, null, $result, $request->user()?->id);

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $result,
        ]);
    }
}
