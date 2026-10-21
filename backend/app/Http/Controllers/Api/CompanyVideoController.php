<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyVideo;
use App\Models\CompanyVideoComment;
use App\Models\Notification;
use App\Models\Product;
use App\Support\CompanyVideoPresenter as P;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Public side of the company video channel + viewer interactions (like, comment, reply)
 * and channel-owner comment moderation (pin, heart, hide).
 */
class CompanyVideoController extends Controller
{
    private const VIDEO_RELATIONS = ['company', 'owner', 'product.city'];

    /** GET /companies/{company}/videos?type=short|long */
    public function channel(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:short,long'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $paginator = $company->videos()
            ->published()
            ->when(($validated['type'] ?? null) === 'short', fn ($q) => $q->where('is_short', true))
            ->when(($validated['type'] ?? null) === 'long', fn ($q) => $q->where('is_short', false))
            ->with(self::VIDEO_RELATIONS)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 24));

        $viewer = $request->user();
        $liked = P::likedVideoIds($viewer, collect($paginator->items())->pluck('id')->all());
        $locale = $request->header('Accept-Language');

        return response()->json([
            'data' => collect($paginator->items())->map(fn (CompanyVideo $v) => P::video($v, $viewer, $liked, $locale)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'shorts_count' => $company->videos()->published()->where('is_short', true)->count(),
                'long_count' => $company->videos()->published()->where('is_short', false)->count(),
            ],
        ]);
    }

    /** GET /products/{product}/videos — company videos about this listing (shown on the listing page). */
    public function forProduct(Request $request, Product $product): JsonResponse
    {
        if (! $product->isAccessibleBy($request->user())) {
            abort(404);
        }
        $videos = CompanyVideo::query()
            ->published()
            ->where('product_id', $product->id)
            ->with(self::VIDEO_RELATIONS)
            ->orderByDesc('is_short')
            ->orderByDesc('published_at')
            ->limit(12)
            ->get();
        $viewer = $request->user();
        $liked = P::likedVideoIds($viewer, $videos->pluck('id')->all());

        return response()->json([
            'data' => $videos->map(fn (CompanyVideo $v) => P::video($v, $viewer, $liked, $request->header('Accept-Language')))->values(),
        ]);
    }

    /** GET /videos/shorts/latest — newest Shorts from all companies (homepage row). */
    public function latestShorts(Request $request): JsonResponse
    {
        $limit = min(24, max(1, (int) $request->query('limit', 12)));
        $videos = CompanyVideo::query()
            ->published()
            ->where('is_short', true)
            ->with(self::VIDEO_RELATIONS)
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
        $viewer = $request->user();
        $liked = P::likedVideoIds($viewer, $videos->pluck('id')->all());

        return response()->json([
            'data' => $videos->map(fn (CompanyVideo $v) => P::video($v, $viewer, $liked, $request->header('Accept-Language')))->values(),
        ]);
    }

    /** GET /videos/{video} — published, or the owner / staff viewing a hidden one. */
    public function show(Request $request, CompanyVideo $video): JsonResponse
    {
        $viewer = $request->user();
        $this->ensureVisible($video, $viewer);
        $video->load(self::VIDEO_RELATIONS);

        // "Up next": the rest of this channel, same kind (Shorts with Shorts).
        $next = CompanyVideo::query()
            ->published()
            ->where('company_id', $video->company_id)
            ->where('is_short', $video->is_short)
            ->whereKeyNot($video->id)
            ->with(self::VIDEO_RELATIONS)
            ->orderByDesc('published_at')
            ->limit(12)
            ->get();
        $locale = $request->header('Accept-Language');
        $liked = P::likedVideoIds($viewer, $next->pluck('id')->all());

        return response()->json([
            'data' => P::video($video, $viewer, null, $locale),
            'meta' => [
                'up_next' => $next->map(fn (CompanyVideo $v) => P::video($v, $viewer, $liked, $locale))->values(),
            ],
        ]);
    }

    /** POST /videos/{video}/view — counted once per viewer (user or IP) every 30 minutes. */
    public function view(Request $request, CompanyVideo $video): JsonResponse
    {
        $this->ensureVisible($video, $request->user());
        $who = $request->user()?->id ? 'u'.$request->user()->id : 'ip'.sha1((string) $request->ip());
        if (Cache::add("video_view:{$video->id}:{$who}", 1, now()->addMinutes(30))) {
            $video->increment('views_count');
        }

        return response()->json(['data' => ['views_count' => (int) $video->fresh()->views_count]]);
    }

    /** POST /videos/{video}/like — toggle. */
    public function toggleLike(Request $request, CompanyVideo $video): JsonResponse
    {
        $user = $request->user();
        $this->ensureVisible($video, $user);

        $liked = DB::transaction(function () use ($video, $user) {
            $deleted = DB::table('company_video_likes')
                ->where('company_video_id', $video->id)
                ->where('user_id', $user->id)
                ->delete();
            if (! $deleted) {
                DB::table('company_video_likes')->insert([
                    'company_video_id' => $video->id,
                    'user_id' => $user->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $video->update(['likes_count' => DB::table('company_video_likes')->where('company_video_id', $video->id)->count()]);

            return ! $deleted;
        });

        return response()->json(['data' => ['liked' => $liked, 'likes_count' => (int) $video->fresh()->likes_count]]);
    }

    /** GET /videos/{video}/comments?sort=top|new — pinned first, replies nested. */
    public function comments(Request $request, CompanyVideo $video): JsonResponse
    {
        $viewer = $request->user();
        $this->ensureVisible($video, $viewer);
        $video->loadMissing('company');
        $canModerate = P::canModerate($viewer, $video);
        $sort = $request->query('sort') === 'new' ? 'new' : 'top';

        $visible = fn ($q) => $canModerate ? $q : $q->where('is_hidden', false);

        $query = $video->comments()
            ->whereNull('parent_id')
            ->tap($visible)
            ->with([
                'author:id,name,username,avatar_url',
                'replies' => fn ($q) => $visible($q)->with('author:id,name,username,avatar_url')->orderBy('created_at'),
            ])
            ->orderByDesc('is_pinned');

        if ($sort === 'top') {
            $query->orderByDesc('owner_hearted')->orderByDesc('likes_count');
        }
        $query->orderByDesc('created_at')->orderByDesc('id');

        $paginator = $query->paginate(20);
        $items = collect($paginator->items());
        $ids = $items->pluck('id')->merge($items->flatMap(fn ($c) => $c->replies->pluck('id')))->all();
        $liked = P::likedCommentIds($viewer, $ids);

        return response()->json([
            'data' => $items->map(fn (CompanyVideoComment $c) => P::comment($c, $video, $viewer, $liked))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'comments_count' => (int) $video->comments_count,
                'can_moderate' => $canModerate,
                'is_owner' => $video->isOwnedBy($viewer),
            ],
        ]);
    }

    public function storeComment(Request $request, CompanyVideo $video): JsonResponse
    {
        $user = $request->user();
        $this->ensureVisible($video, $user);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'parent_id' => ['nullable', 'integer'],
            'timestamp_sec' => ['nullable', 'integer', 'min:0', 'max:86400'],
        ]);

        $parent = null;
        if (! empty($validated['parent_id'])) {
            $parent = CompanyVideoComment::query()
                ->where('company_video_id', $video->id)
                ->whereKey($validated['parent_id'])
                ->first();
            if (! $parent) {
                throw ValidationException::withMessages(['parent_id' => 'التعليق غير موجود.']);
            }
            // One level of replies, like YouTube: a reply to a reply joins the same thread.
            if ($parent->parent_id) {
                $parent = $parent->parent;
            }
        }

        $timestamp = $validated['timestamp_sec'] ?? null;
        if ($timestamp !== null && $video->duration_sec && $timestamp > $video->duration_sec) {
            $timestamp = $video->duration_sec;
        }

        $comment = $video->comments()->create([
            'user_id' => $user->id,
            'parent_id' => $parent?->id,
            'body' => trim($validated['body']),
            'timestamp_sec' => $timestamp,
        ]);
        $video->refreshCommentsCount();

        $this->notifyAboutComment($video, $comment, $parent, $user->id);

        $comment->load('author:id,name,username,avatar_url')->setRelation('replies', collect());

        return response()->json(['data' => P::comment($comment, $video->load('company'), $user, [])], 201);
    }

    public function destroyComment(Request $request, CompanyVideoComment $comment): JsonResponse
    {
        $user = $request->user();
        $video = $comment->video()->with('company')->firstOrFail();
        if ((int) $comment->user_id !== (int) $user->id && ! P::canModerate($user, $video)) {
            abort(403);
        }

        $comment->delete();
        $video->refreshCommentsCount();

        return response()->json(['data' => ['comments_count' => (int) $video->fresh()->comments_count]]);
    }

    public function toggleCommentLike(Request $request, CompanyVideoComment $comment): JsonResponse
    {
        $user = $request->user();
        $this->ensureVisible($comment->video, $user);

        $liked = DB::transaction(function () use ($comment, $user) {
            $deleted = DB::table('company_video_comment_likes')
                ->where('company_video_comment_id', $comment->id)
                ->where('user_id', $user->id)
                ->delete();
            if (! $deleted) {
                DB::table('company_video_comment_likes')->insert([
                    'company_video_comment_id' => $comment->id,
                    'user_id' => $user->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $comment->update(['likes_count' => DB::table('company_video_comment_likes')->where('company_video_comment_id', $comment->id)->count()]);

            return ! $deleted;
        });

        return response()->json(['data' => ['liked' => $liked, 'likes_count' => (int) $comment->fresh()->likes_count]]);
    }

    /** Channel owner pins one top-level comment (pinning another unpins the previous). */
    public function togglePin(Request $request, CompanyVideoComment $comment): JsonResponse
    {
        $video = $this->ownedVideoOf($request, $comment);
        if ($comment->parent_id) {
            throw ValidationException::withMessages(['comment' => 'يمكن تثبيت التعليقات الرئيسية فقط.']);
        }

        $pin = ! $comment->is_pinned;
        DB::transaction(function () use ($video, $comment, $pin) {
            if ($pin) {
                $video->comments()->where('is_pinned', true)->update(['is_pinned' => false]);
            }
            $comment->update(['is_pinned' => $pin]);
        });

        return response()->json(['data' => ['is_pinned' => $pin]]);
    }

    /** Channel owner "hearts" a comment (shown as ❤ by the company). */
    public function toggleHeart(Request $request, CompanyVideoComment $comment): JsonResponse
    {
        $this->ownedVideoOf($request, $comment);
        $comment->update(['owner_hearted' => ! $comment->owner_hearted]);

        if ($comment->owner_hearted && (int) $comment->user_id !== (int) $request->user()->id) {
            Notification::create([
                'user_id' => $comment->user_id,
                'type' => 'video_comment_hearted',
                'title' => 'أعجبت الشركة بتعليقك',
                'body' => mb_strimwidth($comment->body, 0, 80, '…'),
                'data' => ['actions' => [['label' => 'عرض الفيديو', 'href' => '/videos/'.$comment->company_video_id, 'intent' => 'open_video']]],
            ]);
        }

        return response()->json(['data' => ['owner_hearted' => (bool) $comment->owner_hearted]]);
    }

    /** Channel owner or staff hides / shows a comment. */
    public function toggleHide(Request $request, CompanyVideoComment $comment): JsonResponse
    {
        $video = $comment->video()->with('company')->firstOrFail();
        if (! P::canModerate($request->user(), $video)) {
            abort(403);
        }
        $comment->update(['is_hidden' => ! $comment->is_hidden, 'is_pinned' => false]);
        $video->refreshCommentsCount();

        return response()->json(['data' => ['is_hidden' => (bool) $comment->is_hidden]]);
    }

    private function ensureVisible(CompanyVideo $video, $viewer): void
    {
        if ($video->status === CompanyVideo::STATUS_PUBLISHED) {
            return;
        }
        if (! P::canModerate($viewer, $video)) {
            abort(404);
        }
    }

    private function ownedVideoOf(Request $request, CompanyVideoComment $comment): CompanyVideo
    {
        $video = $comment->video;
        if (! $video->isOwnedBy($request->user())) {
            abort(403);
        }

        return $video;
    }

    private function notifyAboutComment(CompanyVideo $video, CompanyVideoComment $comment, ?CompanyVideoComment $parent, int $authorId): void
    {
        $href = '/videos/'.$video->id.'?comment='.$comment->id;
        $recipients = [];
        if ((int) $video->user_id !== $authorId) {
            $recipients[(int) $video->user_id] = ['تعليق جديد على فيديو «'.$video->title.'»', 'video_comment_new'];
        }
        if ($parent && (int) $parent->user_id !== $authorId) {
            $recipients[(int) $parent->user_id] = ['رد جديد على تعليقك', 'video_comment_reply'];
        }

        foreach ($recipients as $userId => [$title, $type]) {
            Notification::create([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'body' => mb_strimwidth($comment->body, 0, 80, '…'),
                'data' => ['actions' => [['label' => 'عرض التعليق', 'href' => $href, 'intent' => 'open_video']]],
            ]);
        }
    }
}
