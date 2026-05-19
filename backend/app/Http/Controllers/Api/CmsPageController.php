<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CmsPageController extends Controller
{
    public function show(Request $request, string $slug): JsonResponse
    {
        $locale = $request->query('locale', app()->getLocale());
        if (! in_array($locale, ['ar', 'en'], true)) {
            $locale = 'ar';
        }

        $page = CmsPage::query()
            ->published()
            ->where('slug', $slug)
            ->where('locale', $locale)
            ->first();

        if (! $page && $locale !== 'ar') {
            $page = CmsPage::query()
                ->published()
                ->where('slug', $slug)
                ->where('locale', 'ar')
                ->first();
        }

        if (! $page) {
            return response()->json(['message' => __('common.not_found')], 404);
        }

        return response()->json([
            'data' => [
                'slug' => $page->slug,
                'locale' => $page->locale,
                'title' => $page->title,
                'body_html' => $page->body_html,
                'meta_title' => $page->meta_title ?? $page->title,
                'meta_description' => $page->meta_description,
                'og_image' => $page->og_image,
                'canonical' => $page->canonical,
                'published_at' => $page->published_at,
                'updated_at' => $page->updated_at,
            ],
        ]);
    }
}
