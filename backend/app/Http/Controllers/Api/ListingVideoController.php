<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyVideo;
use App\Models\Product;
use App\Support\CompanyVideoPresenter as P;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Videos on any listing (all sections, individuals and companies):
 * - the owner attaches / removes a video from the add-listing form;
 * - GET /videos/feed is the TikTok-style page (newest videos, filter by section / city / district).
 *
 * Stored in company_videos so likes, comments, the player and the Shorts viewer work the same;
 * company_id is the owner's company when there is one, else null.
 */
class ListingVideoController extends Controller
{
    private const RELATIONS = ['company', 'owner', 'product.city', 'product.category'];

    /** GET /products/{product}/my-videos — the owner's videos on this listing (edit form). */
    public function mine(Request $request, Product $product): JsonResponse
    {
        $this->ensureOwner($request, $product);
        $viewer = $request->user();
        $videos = $product->videos()->where('user_id', $viewer->id)->with(self::RELATIONS)->latest()->get();

        return response()->json([
            'data' => $videos->map(fn (CompanyVideo $v) => P::video($v, $viewer, [], $request->header('Accept-Language')))->values(),
            'meta' => [
                'max_upload_mb' => (int) floor(config('videos.max_kb') / 1024),
                'short_max_seconds' => (int) config('videos.short_max_seconds'),
            ],
        ]);
    }

    /** POST /products/{product}/videos — multipart: video, thumbnail?, duration_sec? */
    public function store(Request $request, Product $product): JsonResponse
    {
        $this->ensureOwner($request, $product);
        $user = $request->user();

        $validated = $request->validate([
            // Either the file itself (small videos) or the id of a chunked upload (large videos).
            'video' => ['required_without:upload_id', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime,video/x-m4v', 'max:'.(int) config('videos.max_kb')],
            'upload_id' => ['required_without:video', 'uuid'],
            'original_name' => ['nullable', 'string', 'max:255'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:'.(int) config('videos.thumbnail_max_kb')],
            'duration_sec' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'title' => ['nullable', 'string', 'max:150'],
        ], [
            'video.max' => 'حجم الفيديو أكبر من الحد المسموح ('.(int) floor(config('videos.max_kb') / 1024).' ميجابايت).',
            'video.mimetypes' => 'صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV.',
        ]);

        $disk = config('videos.disk', 'public');
        $folder = 'listing-videos/'.$product->id;
        if ($request->hasFile('video')) {
            $file = $request->file('video');
            $videoPath = $file->storeAs($folder, Str::uuid().'.'.($file->getClientOriginalExtension() ?: 'mp4'), $disk);
        } else {
            $videoPath = app(\App\Services\Videos\ChunkedVideoUploads::class)
                ->assemble((int) $user->id, $validated['upload_id'], $folder, $validated['original_name'] ?? null)['path'];
        }

        $thumbnailUrl = null;
        if ($request->hasFile('thumbnail')) {
            $thumb = $request->file('thumbnail');
            $thumbnailUrl = '/storage/'.$thumb->storeAs($folder.'/thumbs', Str::uuid().'.'.($thumb->getClientOriginalExtension() ?: 'jpg'), $disk);
        }

        $duration = isset($validated['duration_sec']) ? (int) $validated['duration_sec'] : null;

        $video = CompanyVideo::create([
            'company_id' => $user->company?->id,
            'user_id' => $user->id,
            'product_id' => $product->id,
            'title' => trim((string) ($validated['title'] ?? '')) ?: Str::limit($product->title, 150, ''),
            'video_path' => $videoPath,
            'thumbnail_url' => $thumbnailUrl ?? ($product->image_url ?? data_get($product->media, 'cover')),
            'duration_sec' => $duration,
            'is_short' => $duration === null || $duration <= (int) config('videos.short_max_seconds'),
            'status' => CompanyVideo::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        return response()->json([
            'data' => P::video($video->load(self::RELATIONS), $user, [], $request->header('Accept-Language')),
        ], 201);
    }

    /** DELETE /products/{product}/videos/{video} */
    public function destroy(Request $request, Product $product, CompanyVideo $video): JsonResponse
    {
        $this->ensureOwner($request, $product);
        if ((int) $video->product_id !== (int) $product->id || ! $video->isOwnedBy($request->user())) {
            abort(404);
        }

        if ($video->video_path) {
            Storage::disk(config('videos.disk', 'public'))->delete($video->video_path);
        }
        $video->delete();

        // A listing without a video can only show its price on the map.
        if (! $product->videos()->published()->exists() && $product->map_display === 'video') {
            $product->update(['map_display' => 'price']);
        }

        return response()->json(['message' => 'deleted']);
    }

    /**
     * GET /videos/feed?category_id=&city_id=&district=&page= — newest videos across the platform
     * (videos linked to a listing follow that listing's section, city and district).
     */
    public function feed(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'district' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:30'],
            'sort' => ['nullable', 'in:latest,most_viewed'],
        ]);

        $filtered = ! empty($validated['category_id']) || ! empty($validated['city_id']) || ! empty($validated['district']);
        $visibleProduct = function ($q) use ($validated) {
            $q->where(fn ($p) => $p->publiclyListed()->orWhere(fn ($a) => $a->publiclyVisibleAwaiting()));
            if (! empty($validated['category_id'])) {
                $q->where('category_id', $validated['category_id']);
            }
            if (! empty($validated['city_id'])) {
                $q->where('city_id', $validated['city_id']);
            }
            if (! empty($validated['district'])) {
                $q->where('district', trim($validated['district']));
            }
        };

        $query = CompanyVideo::query()->published()->with(self::RELATIONS);
        if ($filtered) {
            $query->whereHas('product', $visibleProduct);
        } else {
            // Channel videos without a listing are fine; listing videos only while the listing is visible.
            $query->where(fn ($q) => $q->whereNull('product_id')->orWhereHas('product', $visibleProduct));
        }

        if (($validated['sort'] ?? 'latest') === 'most_viewed') {
            $query->orderByDesc('views_count');
        }
        $page = $query->orderByDesc('published_at')->orderByDesc('id')->paginate((int) ($validated['per_page'] ?? 8));
        $viewer = $request->user();
        $liked = P::likedVideoIds($viewer, $page->getCollection()->pluck('id')->all());
        $locale = $request->header('Accept-Language');

        return response()->json([
            'data' => $page->getCollection()->map(fn (CompanyVideo $v) => P::video($v, $viewer, $liked, $locale))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    private function ensureOwner(Request $request, Product $product): void
    {
        if ((int) $product->user_id !== (int) $request->user()?->id) {
            abort(403);
        }
    }
}
