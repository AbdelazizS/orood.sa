<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminAnnouncement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Get active announcements for banner (public).
     */
    public function index(Request $request): JsonResponse
    {
        $target = $request->get('target', 'all');

        $announcements = AdminAnnouncement::active()
            ->where(function ($q) use ($target) {
                $q->where('target', 'all')->orWhere('target', $target);
            })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'title', 'message', 'type']);

        return response()->json(['data' => $announcements]);
    }
}
