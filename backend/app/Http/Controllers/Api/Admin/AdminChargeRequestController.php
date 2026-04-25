<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\ChargeRequest;
use App\Models\Notification;
use App\Models\Transaction;
use App\Models\User;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdminChargeRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', ChargeRequest::STATUS_PENDING);
        $query = ChargeRequest::with(['user:id,name,email,phone', 'reviewer:id,name'])
            ->orderByDesc('created_at');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $rows = $query->paginate(min((int) $request->get('per_page', 20), 50));

        $data = collect($rows->items())->map(function (ChargeRequest $row) {
            return [
                'id' => $row->id,
                'user_id' => $row->user_id,
                'amount' => (float) $row->amount,
                'payment_method' => $row->payment_method,
                'payer_bank_name' => $row->payer_bank_name,
                'transfer_reference' => $row->transfer_reference,
                'receipt_url' => $row->receipt_url,
                'note' => $row->note,
                'submitted_at' => $row->submitted_at,
                'status' => $row->status,
                'rejection_reason' => $row->rejection_reason,
                'reviewed_at' => $row->reviewed_at,
                'user' => $row->user ? [
                    'id' => $row->user->id,
                    'name' => $row->user->name,
                    'email' => $row->user->email,
                    'phone' => $row->user->phone,
                ] : null,
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function approve(Request $request, ChargeRequest $chargeRequest): JsonResponse
    {
        if ($chargeRequest->status !== ChargeRequest::STATUS_PENDING) {
            return response()->json(['message' => __('common.request_not_pending')], 422);
        }

        $admin = $request->user();
        $amount = (float) $chargeRequest->amount;

        try {
            DB::transaction(function () use ($chargeRequest, $admin, $amount) {
                $balance = Balance::getOrCreateForUser($chargeRequest->user_id);
                $balance->increment('available', $amount);

                Transaction::create([
                    'user_id' => $chargeRequest->user_id,
                    'type' => Transaction::TYPE_DEPOSIT,
                    'amount' => $amount,
                    'description' => __('wallet.charge_request_approved_description'),
                    'status' => Transaction::STATUS_COMPLETED,
                    'completed_at' => now(),
                    'idempotency_key' => $chargeRequest->idempotency_key,
                    'metadata' => [
                        'source' => 'charge_request_approval',
                        'charge_request_id' => $chargeRequest->id,
                        'payment_method' => $chargeRequest->payment_method,
                    ],
                ]);

                $chargeRequest->update([
                    'status' => ChargeRequest::STATUS_APPROVED,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                ]);
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $chargeRequest->refresh();
        if ($member = User::query()->find($chargeRequest->user_id)) {
            Notification::create(InAppNotificationPayload::chargeRequestApprovedForMember($chargeRequest, $member));
        }

        return response()->json([
            'message' => __('wallet.charge_request_approved'),
            'data' => $chargeRequest->fresh(['user', 'reviewer']),
        ]);
    }

    public function reject(Request $request, ChargeRequest $chargeRequest): JsonResponse
    {
        if ($chargeRequest->status !== ChargeRequest::STATUS_PENDING) {
            return response()->json(['message' => __('common.request_not_pending')], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $chargeRequest->update([
            'status' => ChargeRequest::STATUS_REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        $chargeRequest->refresh();
        if ($member = User::query()->find($chargeRequest->user_id)) {
            Notification::create(InAppNotificationPayload::chargeRequestRejectedForMember($chargeRequest, $member));
        }

        return response()->json([
            'message' => __('wallet.charge_request_rejected'),
            'data' => $chargeRequest->fresh(['user', 'reviewer']),
        ]);
    }
}
