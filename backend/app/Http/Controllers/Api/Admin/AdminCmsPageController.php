<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCmsPageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CmsPage::query()->orderBy('slug')->orderBy('locale');
        if ($slug = $request->query('slug')) {
            $query->where('slug', $slug);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);
        $page = CmsPage::create($validated);

        return response()->json(['data' => $page], 201);
    }

    public function update(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $validated = $this->validatePayload($request, partial: true);
        if ($validated !== []) {
            $cmsPage->update(array_merge($validated, [
                'version' => (int) $cmsPage->version + 1,
            ]));
        }

        return response()->json(['data' => $cmsPage->fresh()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request, bool $partial = false): array
    {
        $rules = [
            'slug' => ['sometimes', 'string', 'max:64'],
            'locale' => ['sometimes', 'string', 'in:ar,en'],
            'title' => ['sometimes', 'string', 'max:255'],
            'body_html' => ['nullable', 'string'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'og_image' => ['nullable', 'string', 'max:500'],
            'canonical' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'string', 'in:draft,published'],
            'published_at' => ['nullable', 'date'],
        ];

        if (! $partial) {
            $rules['slug'][0] = 'required';
            $rules['locale'][0] = 'required';
            $rules['title'][0] = 'required';
        }

        return $request->validate($rules);
    }
}
