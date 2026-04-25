<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\Notification;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WithdrawalRequest;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdminWithdrawalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', WithdrawalRequest::STATUS_PENDING);
        $query = WithdrawalRequest::with(['user:id,name,email,phone', 'reviewer:id,name'])
            ->orderByDesc('created_at');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $rows = $query->paginate(min((int) $request->get('per_page', 20), 50));

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function approve(Request $request, WithdrawalRequest $withdrawalRequest): JsonResponse
    {
        if ($withdrawalRequest->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['message' => __('common.request_not_pending')], 422);
        }

        $admin = $request->user();
        $amount = (float) $withdrawalRequest->amount;

        try {
            DB::transaction(function () use ($withdrawalRequest, $admin, $amount) {
                $balance = Balance::getOrCreateForUser($withdrawalRequest->user_id);
                $withdrawable = (float) ($balance->withdrawable ?? 0);
                if ($withdrawable < $amount) {
                    throw new RuntimeException(__('wallet.withdrawal_insufficient_for_approval'));
                }

                $balance->decrement('withdrawable', $amount);

                Transaction::create([
                    'user_id' => $withdrawalRequest->user_id,
                    'type' => Transaction::TYPE_WITHDRAWAL,
                    'amount' => -$amount,
                    'description' => __('wallet.withdrawal_approved_description', ['iban' => $withdrawalRequest->bank_iban]),
                    'status' => Transaction::STATUS_COMPLETED,
                    'completed_at' => now(),
                    'withdrawal_request_id' => $withdrawalRequest->id,
                    'metadata' => [
                        'bank_name' => $withdrawalRequest->bank_name,
                        'bank_iban' => $withdrawalRequest->bank_iban,
                    ],
                ]);

                $withdrawalRequest->update([
                    'status' => WithdrawalRequest::STATUS_APPROVED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                ]);
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $withdrawalRequest->refresh();
        if ($member = User::query()->find($withdrawalRequest->user_id)) {
            Notification::create(InAppNotificationPayload::withdrawalApprovedForMember($withdrawalRequest, $member));
        }

        return response()->json([
            'message' => __('wallet.withdrawal_approved'),
            'data' => $withdrawalRequest->fresh(['user', 'reviewer']),
        ]);
    }

    public function reject(Request $request, WithdrawalRequest $withdrawalRequest): JsonResponse
    {
        if ($withdrawalRequest->status !== WithdrawalRequest::STATUS_PENDING) {
            return response()->json(['message' => __('common.request_not_pending')], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $withdrawalRequest->update([
            'status' => WithdrawalRequest::STATUS_REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        $withdrawalRequest->refresh();
        if ($member = User::query()->find($withdrawalRequest->user_id)) {
            Notification::create(InAppNotificationPayload::withdrawalRejectedForMember($withdrawalRequest, $member));
        }

        return response()->json([
            'message' => __('wallet.withdrawal_rejected'),
            'data' => $withdrawalRequest->fresh(['user', 'reviewer']),
        ]);
    }
}
