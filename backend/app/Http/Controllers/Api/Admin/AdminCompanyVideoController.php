<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyVideo;
use App\Models\Notification;
use App\Services\AuditLogService;
use App\Support\CompanyVideoPresenter as P;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin moderation of company channel videos (hide / restore).
 */
class AdminCompanyVideoController extends Controller
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $status = $request->query('status');

        $paginator = CompanyVideo::query()
            ->when(in_array($status, [CompanyVideo::STATUS_PUBLISHED, CompanyVideo::STATUS_HIDDEN], true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%{$search}%")
                ->orWhereHas('company', fn ($c) => $c->where('name', 'like', "%{$search}%"))))
            ->with(['company', 'owner', 'product.city'])
            ->latest()
            ->paginate(30);

        $viewer = $request->user();

        return response()->json([
            'data' => collect($paginator->items())->map(fn (CompanyVideo $v) => P::video($v, $viewer, [], $request->header('Accept-Language')) + [
                'hidden_reason' => $v->hidden_reason,
            ]),
            'meta' => ['total' => $paginator->total(), 'current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage()],
        ]);
    }

    public function updateStatus(Request $request, CompanyVideo $video): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([CompanyVideo::STATUS_PUBLISHED, CompanyVideo::STATUS_HIDDEN])],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $hidden = $validated['status'] === CompanyVideo::STATUS_HIDDEN;
        $video->update([
            'status' => $validated['status'],
            'hidden_reason' => $hidden ? ($validated['reason'] ?? 'أُخفي من قبل الإدارة') : null,
        ]);
        $this->audit->log($hidden ? 'company_video.hidden' : 'company_video.restored', $video, null, $validated);

        if ($hidden) {
            Notification::create([
                'user_id' => $video->user_id,
                'type' => 'company_video_hidden',
                'title' => 'تم إخفاء فيديو من قناتك',
                'body' => '«'.$video->title.'» — '.($validated['reason'] ?? 'تواصل مع الإدارة لمعرفة التفاصيل.'),
                'data' => ['actions' => [['label' => 'إدارة الفيديوهات', 'href' => '/dashboard/videos', 'intent' => 'open_dashboard']]],
            ]);
        }

        return response()->json(['data' => ['status' => $video->status, 'hidden_reason' => $video->hidden_reason]]);
    }
}
