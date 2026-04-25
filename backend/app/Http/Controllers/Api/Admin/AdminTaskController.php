<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Permission;
use App\Models\Task;
use App\Models\User;
use App\Support\InAppNotificationPayload;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminTaskController extends Controller
{
    private const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'employee', 'moderator'];

    public function __construct(private AuditLogService $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Task::with(['assignee:id,name,email,role', 'creator:id,name,email,role'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('assignee_id')) {
            $query->where('assignee_id', $request->assignee_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $tasks = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $tasks->items(),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['required', 'exists:users,id'],
            'status' => ['sometimes', 'in:todo,in_progress,done'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'due_at' => ['nullable', 'date'],
            'type' => ['sometimes', 'string', 'in:admin,team,inquiry'],
        ]);

        $this->assertStatusPermission($request, null, $validated['status'] ?? Task::STATUS_TODO);
        $assignee = $this->resolveAssigneeOrFail((int) $validated['assignee_id']);

        $validated['type'] = $validated['type'] ?? 'admin';
        $validated['created_by'] = $actor?->id;
        $validated['assignee_id'] = $assignee?->id;

        $task = Task::create($validated);
        $this->audit->log('task.created', $task, null, $validated);

        $this->notifyTaskCreated($task, $actor?->id);

        return response()->json(['data' => $task->load(['assignee', 'creator'])], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $actor = $request->user();
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['sometimes', 'exists:users,id'],
            'status' => ['sometimes', 'in:todo,in_progress,done'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'due_at' => ['nullable', 'date'],
            'type' => ['sometimes', 'string', 'in:admin,team,inquiry'],
        ]);

        $assigneeChanged = array_key_exists('assignee_id', $validated);
        if ($assigneeChanged) {
            if (! $this->requestUserHasPermission($request, 'tasks.assign')) {
                throw ValidationException::withMessages([
                    'assignee_id' => __('You are not allowed to reassign tasks.'),
                ]);
            }
            $assignee = $this->resolveAssigneeOrFail((int) $validated['assignee_id']);
            $validated['assignee_id'] = $assignee?->id;
        }

        if (array_key_exists('status', $validated)) {
            $this->assertStatusPermission($request, $task->status, $validated['status']);
        }

        $oldValues = $task->getOriginal();
        $before = $task->fresh(['assignee', 'creator']);
        $task->update($validated);
        $this->audit->log('task.updated', $task, $oldValues, $validated);

        $after = $task->fresh(['assignee', 'creator']);
        $this->notifyTaskUpdated($before, $after, $actor?->id);

        return response()->json(['data' => $after]);
    }

    public function destroy(Task $task): JsonResponse
    {
        // Delete is treated as close-level action and is additionally guarded.
        if (! $this->requestUserHasPermission(request(), 'tasks.close')) {
            // keep request-level parity with other validation errors
            throw ValidationException::withMessages([
                'task' => __('You are not allowed to delete tasks.'),
            ]);
        }

        $snapshot = $task->load(['assignee', 'creator']);
        $this->audit->log('task.deleted', $task, $task->toArray());
        $task->delete();

        $this->notifyTaskDeleted($snapshot, request()->user()?->id);

        return response()->json(['message' => 'Task deleted']);
    }

    public function assignees(): JsonResponse
    {
        $roleNames = \Illuminate\Support\Facades\DB::table('role_permission')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->where('permissions.name', 'tasks.view')
            ->pluck('role_permission.role')
            ->unique()
            ->values()
            ->all();

        $roleNames = array_values(array_unique(array_merge($roleNames, ['super_admin'])));

        $users = User::whereIn('role', $roleNames)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['data' => $users]);
    }

    private function resolveAssigneeOrFail(int $assigneeId): User
    {
        $assignee = User::query()
            ->whereKey($assigneeId)
            ->whereIn('role', self::STAFF_ROLES)
            ->first();
        if (! $assignee) {
            throw ValidationException::withMessages([
                'assignee_id' => __('Assignee must be an active staff member.'),
            ]);
        }

        $permissions = Permission::getForRole((string) $assignee->role);
        if (! in_array('tasks.view', $permissions, true) && ! in_array('*', $permissions, true)) {
            throw ValidationException::withMessages([
                'assignee_id' => __('Assignee role is not allowed to receive tasks.'),
            ]);
        }

        return $assignee;
    }

    private function assertStatusPermission(Request $request, ?string $oldStatus, string $newStatus): void
    {
        if ($newStatus === Task::STATUS_DONE || ($oldStatus === Task::STATUS_DONE && $newStatus !== Task::STATUS_DONE)) {
            if (! $this->requestUserHasPermission($request, 'tasks.close')) {
                throw ValidationException::withMessages([
                    'status' => __('You are not allowed to close or reopen tasks.'),
                ]);
            }
        }
    }

    private function requestUserHasPermission(Request $request, string $permission): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }
        if (($user->role ?? null) === 'super_admin') {
            return true;
        }

        return in_array($permission, Permission::getForRole((string) $user->role), true);
    }

    private function notifyTaskCreated(Task $task, ?int $actorId): void
    {
        $task->loadMissing(['assignee', 'creator']);
        if ($task->assignee_id && (int) $task->assignee_id !== (int) $actorId) {
            Notification::create(
                InAppNotificationPayload::taskAssigned((int) $task->assignee_id, $task, $task->creator?->name)
            );
        }

        if ($task->type === Task::TYPE_TEAM) {
            $this->notifyTeamWatchers($task, 'task_team_created', $actorId);
        }
    }

    private function notifyTaskUpdated(Task $before, Task $after, ?int $actorId): void
    {
        if ((int) $before->assignee_id !== (int) $after->assignee_id && $after->assignee_id) {
            Notification::create(
                InAppNotificationPayload::taskReassigned(
                    (int) $after->assignee_id,
                    $after,
                    $after->creator?->name
                )
            );
        }

        if ($before->status !== $after->status) {
            $targets = collect([(int) $after->assignee_id, (int) $after->created_by])
                ->filter(fn ($id) => $id > 0 && $id !== (int) $actorId)
                ->unique()
                ->values()
                ->all();

            foreach ($targets as $userId) {
                Notification::create(
                    InAppNotificationPayload::taskStatusChanged($userId, $after, $before->status, $after->status)
                );
            }
        }

        if ($after->type === Task::TYPE_TEAM) {
            $this->notifyTeamWatchers($after, 'task_team_updated', $actorId);
        }
    }

    private function notifyTaskDeleted(Task $task, ?int $actorId): void
    {
        $targetIds = collect([(int) $task->assignee_id, (int) $task->created_by])
            ->filter(fn ($id) => $id > 0 && $id !== (int) $actorId)
            ->unique()
            ->values()
            ->all();

        foreach ($targetIds as $userId) {
            Notification::create(InAppNotificationPayload::taskDeleted($userId, $task));
        }

        if ($task->type === Task::TYPE_TEAM) {
            $this->notifyTeamWatchers($task, 'task_team_updated', $actorId);
        }
    }

    private function notifyTeamWatchers(Task $task, string $type, ?int $actorId): void
    {
        $watcherIds = Permission::userIdsHavingPermission('tasks.view');
        foreach ($watcherIds as $userId) {
            if ((int) $userId === (int) $actorId || (int) $userId === (int) $task->assignee_id) {
                continue;
            }
            Notification::create(
                InAppNotificationPayload::taskTeamWatcher((int) $userId, $task, $type)
            );
        }
    }
}
