<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTaskController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Task::with('assignee')->orderByDesc('created_at');

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
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'status' => ['sometimes', 'in:todo,in_progress,done'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'due_at' => ['nullable', 'date'],
            'type' => ['sometimes', 'string', 'in:admin,team,inquiry'],
        ]);
        $validated['type'] = $validated['type'] ?? 'admin';

        $task = Task::create($validated);
        $this->audit->log('task.created', $task, null, $validated);

        return response()->json(['data' => $task->load('assignee')], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'status' => ['sometimes', 'in:todo,in_progress,done'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'due_at' => ['nullable', 'date'],
            'type' => ['sometimes', 'string', 'in:admin,team,inquiry'],
        ]);

        $oldValues = $task->getOriginal();
        $task->update($validated);
        $this->audit->log('task.updated', $task, $oldValues, $validated);

        return response()->json(['data' => $task->fresh()->load('assignee')]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->audit->log('task.deleted', $task, $task->toArray());
        $task->delete();
        return response()->json(['message' => 'Task deleted']);
    }

    public function assignees(): JsonResponse
    {
        $users = User::whereIn('role', ['super_admin', 'admin', 'manager', 'employee'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['data' => $users]);
    }
}
