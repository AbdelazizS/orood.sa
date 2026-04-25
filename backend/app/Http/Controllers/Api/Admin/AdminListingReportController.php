<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ListingReport;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminListingReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ListingReport::query()
            ->with([
                'product' => function ($q) {
                    $q->select('id', 'title', 'status', 'moderation_status', 'user_id')
                        ->with('seller:id,name,email');
                },
                'user:id,name,email',
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
                    ->orWhereHas('product', fn ($p) => $p->where('title', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%")
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

        $items = collect($reports->items())->map(function (ListingReport $report) {
            return array_merge($report->toArray(), [
                'allowed_next_statuses' => ListingReport::nextStatuses($report->status),
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

    public function show(ListingReport $listing_report): JsonResponse
    {
        $listing_report->load([
            'product' => function ($q) {
                $q->select('id', 'title', 'status', 'moderation_status', 'user_id')
                    ->with('seller:id,name,email');
            },
            'user:id,name,email',
            'assignedTo:id,name,email',
        ]);

        return response()->json([
            'data' => array_merge($listing_report->toArray(), [
                'allowed_next_statuses' => ListingReport::nextStatuses($listing_report->status),
            ]),
        ]);
    }

    public function update(Request $request, ListingReport $listing_report): JsonResponse
    {
        $statuses = [
            ListingReport::STATUS_NEW,
            ListingReport::STATUS_INVESTIGATING,
            ListingReport::STATUS_ACTION_TAKEN,
            ListingReport::STATUS_REJECTED,
            ListingReport::STATUS_CLOSED,
        ];
        $actions = ['hide_listing', 'unpublish_listing', 'flag_review'];

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in($statuses)],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'resolution_note' => ['nullable', 'string', 'max:4000'],
            'action_type' => ['nullable', 'string', Rule::in($actions)],
        ]);

        $nextStatus = $validated['status'];
        if (! $listing_report->canTransitionTo($nextStatus) && $listing_report->status !== $nextStatus) {
            return response()->json([
                'message' => 'Invalid status transition',
            ], 422);
        }

        if ($nextStatus === ListingReport::STATUS_ACTION_TAKEN && empty($validated['action_type'])) {
            return response()->json(['message' => 'action_type is required for action_taken status'], 422);
        }

        $actionPayload = $listing_report->action_payload ?? [];
        if (! empty($validated['action_type'])) {
            $product = $listing_report->product;
            if ($product) {
                $actionPayload = $this->applyListingAction($product, $validated['action_type']);
            }
        }

        $listing_report->update([
            'status' => $nextStatus,
            'assigned_to' => $validated['assigned_to'] ?? $listing_report->assigned_to,
            'resolution_note' => $validated['resolution_note'] ?? $listing_report->resolution_note,
            'action_type' => $validated['action_type'] ?? $listing_report->action_type,
            'action_payload' => $actionPayload,
            'reviewed_at' => now(),
        ]);

        $fresh = $listing_report->fresh();
        if ($fresh) {
            $fresh->load([
                'product' => function ($q) {
                    $q->select('id', 'title', 'status', 'moderation_status', 'user_id')
                        ->with('seller:id,name,email');
                },
                'user:id,name,email',
                'assignedTo:id,name,email',
            ]);
        }

        return response()->json([
            'message' => 'Report updated successfully.',
            'data' => $fresh ? array_merge($fresh->toArray(), [
                'allowed_next_statuses' => ListingReport::nextStatuses($fresh->status),
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
        $byStatus = ListingReport::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'all' => (int) ListingReport::query()->count(),
            ListingReport::STATUS_NEW => (int) ($byStatus[ListingReport::STATUS_NEW] ?? 0),
            ListingReport::STATUS_INVESTIGATING => (int) ($byStatus[ListingReport::STATUS_INVESTIGATING] ?? 0),
            ListingReport::STATUS_ACTION_TAKEN => (int) ($byStatus[ListingReport::STATUS_ACTION_TAKEN] ?? 0),
            ListingReport::STATUS_REJECTED => (int) ($byStatus[ListingReport::STATUS_REJECTED] ?? 0),
            ListingReport::STATUS_CLOSED => (int) ($byStatus[ListingReport::STATUS_CLOSED] ?? 0),
        ];
    }

    private function applyListingAction(Product $product, string $actionType): array
    {
        $payload = [
            'previous_status' => $product->status,
            'previous_moderation_status' => $product->moderation_status,
            'applied_at' => now()->toISOString(),
            'action_type' => $actionType,
        ];

        if ($actionType === 'hide_listing') {
            $product->update([
                'status' => 'suspended',
                'moderation_status' => 'rejected',
            ]);
        } elseif ($actionType === 'unpublish_listing') {
            $product->update(['status' => 'archived']);
        } elseif ($actionType === 'flag_review') {
            $product->update(['moderation_status' => 'pending']);
        }

        $payload['new_status'] = $product->status;
        $payload['new_moderation_status'] = $product->moderation_status;

        return $payload;
    }
}

