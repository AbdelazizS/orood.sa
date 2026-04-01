<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAnnouncement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AdminAnnouncement::query()->orderByDesc('created_at');

        if ($request->filled('active')) {
            if ($request->active === '1' || $request->active === 'true') {
                $query->active();
            } else {
                $query->where('active', false);
            }
        }

        $announcements = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $announcements->items(),
            'meta' => [
                'current_page' => $announcements->currentPage(),
                'last_page' => $announcements->lastPage(),
                'per_page' => $announcements->perPage(),
                'total' => $announcements->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'type' => ['sometimes', 'string', 'in:info,warning,alert'],
            'target' => ['sometimes', 'string', 'in:all,individuals,companies,team'],
            'active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $announcement = AdminAnnouncement::create($validated);

        return response()->json(['data' => $announcement], 201);
    }

    public function update(Request $request, AdminAnnouncement $admin_announcement): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'message' => ['sometimes', 'string', 'max:2000'],
            'type' => ['sometimes', 'string', 'in:info,warning,alert'],
            'target' => ['sometimes', 'string', 'in:all,individuals,companies,team'],
            'active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $admin_announcement->update($validated);

        return response()->json(['data' => $admin_announcement->fresh()]);
    }

    public function destroy(AdminAnnouncement $admin_announcement): JsonResponse
    {
        $admin_announcement->delete();
        return response()->json(['message' => 'Announcement deleted']);
    }
}
