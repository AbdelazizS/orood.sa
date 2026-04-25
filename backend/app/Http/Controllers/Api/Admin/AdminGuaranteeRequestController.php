<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuaranteeRequest;
use App\Models\Notification;
use App\Support\InAppNotificationPayload;
use App\Services\GuaranteeWallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminGuaranteeRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GuaranteeRequest::query()
            ->with(['user:id,name,email'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $paginator = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function approve(Request $request, GuaranteeRequest $guaranteeRequest): JsonResponse
    {
        if ($guaranteeRequest->status !== GuaranteeRequest::STATUS_PENDING) {
            return response()->json(['message' => __('compliance.guarantee_request_not_pending')], 422);
        }

        $user = $guaranteeRequest->user;
        $admin = $request->user();

        try {
            if ($guaranteeRequest->type === GuaranteeRequest::TYPE_DEPOSIT) {
                $amount = (float) ($guaranteeRequest->amount ?? 0);
                if ($amount < 100) {
                    return response()->json(['message' => __('Invalid guarantee amount.')], 422);
                }
                GuaranteeWallet::applyDeposit($user, $amount);
            } else {
                GuaranteeWallet::applyRefund($user);
            }
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $guaranteeRequest->update([
            'status' => GuaranteeRequest::STATUS_APPROVED,
            'processed_by' => $admin->id,
            'processed_at' => now(),
        ]);

        $guaranteeRequest->refresh();
        Notification::create(InAppNotificationPayload::guaranteeRequestApprovedForMember($guaranteeRequest, $user));

        return response()->json([
            'message' => __('compliance.guarantee_request_approved'),
            'data' => $guaranteeRequest->fresh(['user']),
        ]);
    }

    public function reject(Request $request, GuaranteeRequest $guaranteeRequest): JsonResponse
    {
        if ($guaranteeRequest->status !== GuaranteeRequest::STATUS_PENDING) {
            return response()->json(['message' => __('compliance.guarantee_request_not_pending')], 422);
        }

        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $member = $guaranteeRequest->user;

        $guaranteeRequest->update([
            'status' => GuaranteeRequest::STATUS_REJECTED,
            'admin_note' => $validated['admin_note'] ?? null,
            'processed_by' => $request->user()->id,
            'processed_at' => now(),
        ]);

        $guaranteeRequest->refresh();
        Notification::create(InAppNotificationPayload::guaranteeRequestRejectedForMember($guaranteeRequest, $member));

        return response()->json([
            'message' => __('compliance.guarantee_request_rejected'),
            'data' => $guaranteeRequest->fresh(['user']),
        ]);
    }
}
