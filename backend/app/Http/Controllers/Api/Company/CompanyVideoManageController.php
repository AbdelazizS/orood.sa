<?php

namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyVideo;
use App\Models\Product;
use App\Support\CompanyVideoPresenter as P;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The company's own channel: upload / edit / hide / delete videos, and its activities (marketer, developer, seller).
 */
class CompanyVideoManageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $company = $this->companyOf($request);
        $videos = $company->videos()->with(['company', 'owner', 'product.city'])->latest()->get();
        $viewer = $request->user();
        $locale = $request->header('Accept-Language');

        return response()->json([
            'data' => $videos->map(fn (CompanyVideo $v) => P::video($v, $viewer, [], $locale))->values(),
            'meta' => [
                'company' => $this->companyPayload($company),
                'max_upload_mb' => (int) floor(config('videos.max_kb') / 1024),
                'short_max_seconds' => (int) config('videos.short_max_seconds'),
                'listings' => Product::query()
                    ->where('user_id', $viewer->id)
                    ->whereNotIn('status', ['deleted'])
                    ->orderByDesc('id')
                    ->limit(200)
                    ->get(['id', 'title'])
                    ->map(fn ($p) => ['id' => $p->id, 'title' => $p->title]),
            ],
        ]);
    }

    /** Multipart upload: video file + optional thumbnail (the browser extracts a frame and the duration). */
    public function store(Request $request): JsonResponse
    {
        $company = $this->companyOf($request);
        $user = $request->user();

        $validated = $request->validate([
            'video' => ['required', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime,video/x-m4v', 'max:'.(int) config('videos.max_kb')],
            'thumbnail' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:'.(int) config('videos.thumbnail_max_kb')],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_short' => ['nullable', 'boolean'],
            'duration_sec' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('user_id', $user->id)],
        ], [
            'video.max' => 'حجم الفيديو أكبر من الحد المسموح ('.(int) floor(config('videos.max_kb') / 1024).' ميجابايت).',
            'video.mimetypes' => 'صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV.',
            'product_id.exists' => 'يمكن ربط الفيديو بإعلانات شركتك فقط.',
        ]);

        $disk = config('videos.disk', 'public');
        $folder = 'company-videos/'.$company->id;
        $videoFile = $request->file('video');
        $videoPath = $videoFile->storeAs($folder, Str::uuid().'.'.($videoFile->getClientOriginalExtension() ?: 'mp4'), $disk);

        $thumbnailUrl = null;
        if ($request->hasFile('thumbnail')) {
            $thumb = $request->file('thumbnail');
            $thumbPath = $thumb->storeAs($folder.'/thumbs', Str::uuid().'.'.($thumb->getClientOriginalExtension() ?: 'jpg'), $disk);
            $thumbnailUrl = '/storage/'.$thumbPath;
        }

        $duration = isset($validated['duration_sec']) ? (int) $validated['duration_sec'] : null;
        $isShort = array_key_exists('is_short', $validated)
            ? (bool) $validated['is_short']
            : ($duration !== null && $duration <= (int) config('videos.short_max_seconds'));

        $video = CompanyVideo::create([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'product_id' => $validated['product_id'] ?? null,
            'title' => trim($validated['title']),
            'description' => $validated['description'] ?? null,
            'video_path' => $videoPath,
            'thumbnail_url' => $thumbnailUrl,
            'duration_sec' => $duration,
            'is_short' => $isShort,
            'status' => CompanyVideo::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        return response()->json([
            'data' => P::video($video->load(['company', 'owner', 'product.city']), $user, [], $request->header('Accept-Language')),
        ], 201);
    }

    public function update(Request $request, CompanyVideo $video): JsonResponse
    {
        $this->ensureOwner($request, $video);
        $user = $request->user();

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'is_short' => ['sometimes', 'boolean'],
            'product_id' => ['sometimes', 'nullable', 'integer', Rule::exists('products', 'id')->where('user_id', $user->id)],
            'status' => ['sometimes', Rule::in([CompanyVideo::STATUS_PUBLISHED, CompanyVideo::STATUS_HIDDEN])],
        ]);

        // A video hidden by the admins stays hidden until they restore it.
        if (($validated['status'] ?? null) === CompanyVideo::STATUS_PUBLISHED && $video->hidden_reason) {
            unset($validated['status']);
        }

        $video->update($validated);

        return response()->json([
            'data' => P::video($video->fresh(['company', 'owner', 'product.city']), $user, [], $request->header('Accept-Language')),
        ]);
    }

    public function destroy(Request $request, CompanyVideo $video): JsonResponse
    {
        $this->ensureOwner($request, $video);

        if ($video->video_path) {
            Storage::disk(config('videos.disk', 'public'))->delete($video->video_path);
        }
        if ($video->thumbnail_url && str_starts_with($video->thumbnail_url, '/storage/company-videos/')) {
            Storage::disk(config('videos.disk', 'public'))->delete(substr($video->thumbnail_url, strlen('/storage/')));
        }
        $video->delete();

        return response()->json(['message' => 'تم حذف الفيديو']);
    }

    public function updateActivities(Request $request): JsonResponse
    {
        $company = $this->companyOf($request);
        $validated = $request->validate([
            'activities' => ['present', 'array'],
            'activities.*' => ['string', Rule::in(Company::ACTIVITIES)],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'fal_license_no' => ['sometimes', 'nullable', 'string', 'max:50', 'regex:/^[0-9A-Za-z\-]+$/'],
        ]);

        $company->update([
            'activities' => array_values(array_unique($validated['activities'])),
            ...(array_key_exists('description', $validated) ? ['description' => $validated['description']] : []),
            ...(array_key_exists('fal_license_no', $validated) ? ['fal_license_no' => $validated['fal_license_no'] ?: null] : []),
        ]);

        return response()->json(['data' => $this->companyPayload($company->fresh())]);
    }

    private function companyOf(Request $request): Company
    {
        $company = $request->user()->company;
        if (! $company) {
            abort(403, 'هذه الميزة لحسابات الشركات فقط.');
        }

        return $company;
    }

    private function ensureOwner(Request $request, CompanyVideo $video): void
    {
        if (! $video->isOwnedBy($request->user())) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function companyPayload(Company $company): array
    {
        return [
            'id' => $company->id,
            'name' => $company->name,
            'description' => $company->description,
            'activities' => $company->activities ?? [],
            'fal_license_no' => $company->fal_license_no,
            'is_verified' => $company->verification_status === 'approved',
        ];
    }
}
