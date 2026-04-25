<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProfileReport;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminProfileReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ProfileReport::query()
            ->with([
                'reportedUser:id,username,name,email',
                'reporter:id,username,name,email',
                'assignedTo:id,name,email',
            ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }
        if ($request->filled('assigned_to')) {
            if ($request->string('assigned_to')->toString() === 'unassigned') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', (int) $request->input('assigned_to'));
            }
        }
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('reason', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('reportedUser', fn ($u) => $u->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('reporter', fn ($u) => $u->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $sort = (string) $request->input('sort', '-created_at');
        $sortColumn = ltrim($sort, '-');
        $sortDir = str_starts_with($sort, '-') ? 'desc' : 'asc';
        if (! in_array($sortColumn, ['created_at', 'updated_at', 'id'], true)) {
            $sortColumn = 'created_at';
            $sortDir = 'desc';
        }
        $query->orderBy($sortColumn, $sortDir);

        $perPage = max(10, min(100, (int) $request->input('per_page', 20)));

        $reports = $query->paginate($perPage);

        $items = collect($reports->items())->map(function (ProfileReport $report) {
            return array_merge($report->toArray(), [
                'allowed_next_statuses' => ProfileReport::nextStatuses($report->status),
            ]);
        })->all();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
            'counts' => $this->reportStatusCounts(),
        ]);
    }

    public function show(ProfileReport $profile_report): JsonResponse
    {
        $profile_report->load([
            'reportedUser:id,username,name,email',
            'reporter:id,username,name,email',
            'assignedTo:id,name,email',
        ]);

        return response()->json([
            'data' => array_merge($profile_report->toArray(), [
                'allowed_next_statuses' => ProfileReport::nextStatuses($profile_report->status),
            ]),
        ]);
    }

    public function update(Request $request, ProfileReport $profile_report): JsonResponse
    {
        $statuses = [
            ProfileReport::STATUS_NEW,
            ProfileReport::STATUS_INVESTIGATING,
            ProfileReport::STATUS_ACTION_TAKEN,
            ProfileReport::STATUS_REJECTED,
            ProfileReport::STATUS_CLOSED,
        ];
        $actions = ['no_action', 'user_warning'];

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in($statuses)],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'resolution_note' => ['nullable', 'string', 'max:4000'],
            'action_type' => ['nullable', 'string', Rule::in($actions)],
        ]);

        $nextStatus = $validated['status'];
        if (! $profile_report->canTransitionTo($nextStatus) && $profile_report->status !== $nextStatus) {
            return response()->json([
                'message' => 'Invalid status transition',
            ], 422);
        }

        if ($nextStatus === ProfileReport::STATUS_ACTION_TAKEN && empty($validated['action_type'])) {
            return response()->json(['message' => 'action_type is required for action_taken status'], 422);
        }

        $actionPayload = $profile_report->action_payload ?? [];
        if (! empty($validated['action_type'])) {
            $actionPayload = $this->applyProfileAction($profile_report, $validated['action_type'], $actionPayload);
        }

        $profile_report->update([
            'status' => $nextStatus,
            'assigned_to' => $validated['assigned_to'] ?? $profile_report->assigned_to,
            'resolution_note' => $validated['resolution_note'] ?? $profile_report->resolution_note,
            'action_type' => $validated['action_type'] ?? $profile_report->action_type,
            'action_payload' => $actionPayload,
            'reviewed_at' => now(),
        ]);

        $fresh = $profile_report->fresh();
        if ($fresh) {
            $fresh->load([
                'reportedUser:id,username,name,email',
                'reporter:id,username,name,email',
                'assignedTo:id,name,email',
            ]);
        }

        return response()->json([
            'message' => 'Report updated successfully.',
            'data' => $fresh ? array_merge($fresh->toArray(), [
                'allowed_next_statuses' => ProfileReport::nextStatuses($fresh->status),
            ]) : null,
        ]);
    }

    public function assignees(): JsonResponse
    {
        $users = User::query()
            ->whereIn('role', ['super_admin', 'admin', 'manager', 'employee'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['data' => $users]);
    }

    /**
     * @return array<string, int>
     */
    private function reportStatusCounts(): array
    {
        $byStatus = ProfileReport::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'all' => (int) ProfileReport::query()->count(),
            ProfileReport::STATUS_NEW => (int) ($byStatus[ProfileReport::STATUS_NEW] ?? 0),
            ProfileReport::STATUS_INVESTIGATING => (int) ($byStatus[ProfileReport::STATUS_INVESTIGATING] ?? 0),
            ProfileReport::STATUS_ACTION_TAKEN => (int) ($byStatus[ProfileReport::STATUS_ACTION_TAKEN] ?? 0),
            ProfileReport::STATUS_REJECTED => (int) ($byStatus[ProfileReport::STATUS_REJECTED] ?? 0),
            ProfileReport::STATUS_CLOSED => (int) ($byStatus[ProfileReport::STATUS_CLOSED] ?? 0),
        ];
    }

    /**
     * @param  array<string, mixed>  $actionPayload
     * @return array<string, mixed>
     */
    private function applyProfileAction(ProfileReport $report, string $actionType, array $actionPayload): array
    {
        $actionPayload['applied_at'] = now()->toISOString();
        $actionPayload['action_type'] = $actionType;
        $actionPayload['reported_user_id'] = $report->reported_user_id;

        if ($actionType === 'user_warning') {
            $actionPayload['warning_recorded'] = true;
        }

        return $actionPayload;
    }
}
