<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SeoAuditLog;
use App\Models\SeoGlobalSetting;
use App\Models\SeoPageMeta;
use App\Models\SeoSitemapSetting;
use App\Services\AuditLogService;
use App\Services\Seo\SeoSitemapGenerator;
use App\Services\Seo\SeoSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;

class AdminSeoController extends Controller
{
    public function __construct(
        private readonly SeoSettingsService $seo,
        private readonly SeoSitemapGenerator $sitemap,
        private readonly AuditLogService $audit
    ) {}

    public function dashboard(): JsonResponse
    {
        $settings = SeoSitemapSetting::current();

        return response()->json([
            'data' => [
                'page_meta_count' => SeoPageMeta::query()->count(),
                'active_pages' => SeoPageMeta::query()->where('is_active', true)->count(),
                'pending_audit_issues' => SeoAuditLog::query()->where('status', 'pending')->count(),
                'sitemap' => [
                    'last_generated_at' => $settings->last_generated_at?->toIso8601String(),
                    'last_url_count' => $settings->last_url_count,
                    'auto_generate' => $settings->auto_generate,
                ],
            ],
        ]);
    }

    public function globalShow(): JsonResponse
    {
        return response()->json(['data' => $this->seo->globalSettings()]);
    }

    public function globalUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'site_name' => ['sometimes', 'string', 'max:120'],
            'title_suffix' => ['sometimes', 'string', 'max:120'],
            'meta_description' => ['sometimes', 'string', 'max:500'],
            'meta_keywords' => ['sometimes', 'nullable', 'string', 'max:500'],
            'og_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'twitter_site' => ['sometimes', 'nullable', 'string', 'max:80'],
            'robots' => ['sometimes', 'string', 'max:80'],
            'geo_region' => ['sometimes', 'nullable', 'string', 'max:10'],
            'geo_placename' => ['sometimes', 'nullable', 'string', 'max:80'],
            'author' => ['sometimes', 'nullable', 'string', 'max:120'],
            'hreflang_default' => ['sometimes', 'string', 'max:5'],
            'schema_toggles' => ['sometimes', 'array'],
            'organization' => ['sometimes', 'array'],
            'site_url' => ['sometimes', 'url', 'max:255'],
        ]);

        $before = $this->seo->globalSettings();
        $this->seo->setGlobalSettings($validated);
        $after = $this->seo->globalSettings();
        $this->audit->log('seo.global.update', null, $before, $after, $request->user()?->id);

        return response()->json(['message' => __('settings.updated'), 'data' => $after]);
    }

    public function pagesIndex(): JsonResponse
    {
        return response()->json(['data' => $this->seo->listPageMeta()]);
    }

    public function pagesStore(Request $request): JsonResponse
    {
        $validated = $this->validatePageMeta($request);
        $page = $this->seo->upsertPageMeta($validated['page_key'], $validated);

        return response()->json(['data' => $page], 201);
    }

    public function pagesUpdate(Request $request, string $pageKey): JsonResponse
    {
        $validated = $this->validatePageMeta($request, false);
        $page = $this->seo->upsertPageMeta($pageKey, $validated);

        return response()->json(['data' => $page]);
    }

    public function pagesDestroy(string $pageKey): JsonResponse
    {
        SeoPageMeta::query()->where('page_key', $pageKey)->delete();
        $this->seo->clearCache();

        return response()->json(['message' => __('settings.updated')]);
    }

    public function pagesBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rows' => ['required', 'array'],
            'rows.*.page_key' => ['required', 'string', 'max:120'],
        ]);

        $count = 0;
        foreach ($validated['rows'] as $row) {
            $key = $row['page_key'];
            unset($row['page_key']);
            $this->seo->upsertPageMeta($key, $row);
            $count++;
        }

        return response()->json(['message' => __('settings.updated'), 'count' => $count]);
    }

    public function syncCategories(): JsonResponse
    {
        $count = $this->seo->syncCategoryPageMeta();

        return response()->json(['message' => __('settings.updated'), 'count' => $count]);
    }

    public function sitemapShow(): JsonResponse
    {
        return response()->json(['data' => SeoSitemapSetting::current()]);
    }

    public function sitemapUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'include_main' => ['sometimes', 'boolean'],
            'include_categories' => ['sometimes', 'boolean'],
            'include_subcategories' => ['sometimes', 'boolean'],
            'include_offers' => ['sometimes', 'boolean'],
            'include_requests' => ['sometimes', 'boolean'],
            'include_wholesale' => ['sometimes', 'boolean'],
            'include_companies' => ['sometimes', 'boolean'],
            'include_cities' => ['sometimes', 'boolean'],
            'include_profiles' => ['sometimes', 'boolean'],
            'urls_per_file' => ['sometimes', 'integer', 'min:1000', 'max:50000'],
            'auto_generate' => ['sometimes', 'boolean'],
            'generation_time' => ['sometimes', 'date_format:H:i'],
            'ping_google' => ['sometimes', 'boolean'],
            'ping_bing' => ['sometimes', 'boolean'],
        ]);

        $settings = SeoSitemapSetting::current();
        $settings->update($validated);

        return response()->json(['data' => $settings->fresh()]);
    }

    public function sitemapGenerate(Request $request): JsonResponse
    {
        $base = $request->input('base_url');
        $result = $this->sitemap->generate($base);

        if (SeoSitemapSetting::current()->ping_google || SeoSitemapSetting::current()->ping_bing) {
            Artisan::call('seo:ping-search-engines');
        }

        return response()->json([
            'message' => __('settings.updated'),
            'data' => $result,
        ]);
    }

    public function robotsShow(): JsonResponse
    {
        $path = public_path('robots.txt');
        $content = File::exists($path) ? File::get($path) : '';

        return response()->json([
            'data' => [
                'content' => $content,
                'stored' => SeoSitemapSetting::current()->robots_txt,
            ],
        ]);
    }

    public function robotsUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
        ]);

        $settings = SeoSitemapSetting::current();
        $settings->update(['robots_txt' => $validated['content']]);
        File::put(public_path('robots.txt'), $validated['content']);

        return response()->json(['message' => __('settings.updated')]);
    }

    public function auditIssues(): JsonResponse
    {
        $issues = SeoAuditLog::query()
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json(['data' => $issues]);
    }

    public function runAudit(): JsonResponse
    {
        Artisan::call('seo:audit-meta');

        return response()->json(['message' => __('settings.updated')]);
    }

    public function clearCache(): JsonResponse
    {
        $this->seo->clearCache();
        Artisan::call('seo:clear-cache');

        return response()->json(['message' => __('settings.updated')]);
    }

    public function uploadOgImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:4096',
                Rule::file()->types(['png', 'jpg', 'jpeg', 'webp']),
            ],
        ]);

        $path = $validated['file']->store('seo', 'public');
        $url = '/storage/'.$path;
        SeoGlobalSetting::setValue('og_image', $url);
        $this->seo->clearCache();

        return response()->json(['data' => ['url' => $url]]);
    }

    /** @return array<string, mixed> */
    private function validatePageMeta(Request $request, bool $requireKey = true): array
    {
        return $request->validate([
            'page_key' => [$requireKey ? 'required' : 'sometimes', 'string', 'max:120'],
            'route_pattern' => ['sometimes', 'nullable', 'string', 'max:255'],
            'page_type' => ['sometimes', 'string', 'max:40'],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'meta_keywords' => ['sometimes', 'nullable', 'string', 'max:500'],
            'canonical_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'robots' => ['sometimes', 'string', 'max:80'],
            'og_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'og_description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'og_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'og_type' => ['sometimes', 'string', 'max:40'],
            'twitter_card' => ['sometimes', 'string', 'max:40'],
            'priority' => ['sometimes', 'numeric', 'min:0', 'max:1'],
            'changefreq' => ['sometimes', 'string', 'max:20'],
            'custom_schema' => ['sometimes', 'nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
