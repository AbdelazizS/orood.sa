<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderPaymentRequest;
use App\Models\Purchase;
use App\Services\Finance\FinancialNotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminOrderPaymentRequestController extends Controller
{
    public function __construct(private readonly FinancialNotificationDispatcher $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $query = OrderPaymentRequest::query()
            ->with(['purchase.product', 'purchase.buyer', 'purchase.seller', 'values', 'paymentMethod'])
            ->latest('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(25));
    }

    public function approve(Request $request, OrderPaymentRequest $orderPaymentRequest): JsonResponse
    {
        if ($orderPaymentRequest->status !== OrderPaymentRequest::STATUS_PENDING) {
            return response()->json(['message' => __('finance.request_not_pending')], 422);
        }

        DB::transaction(function () use ($orderPaymentRequest, $request) {
            $orderPaymentRequest->update([
                'status' => OrderPaymentRequest::STATUS_APPROVED,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            // Compliance review only — purchase status advances when buyer confirms transfer sent.
        });

        $orderPaymentRequest->refresh();
        $this->notifications->orderPaymentComplianceReviewed($orderPaymentRequest);

        return response()->json([
            'message' => __('finance.order_payment_approved'),
            'data' => $orderPaymentRequest->load(['purchase', 'values']),
        ]);
    }

    public function reject(Request $request, OrderPaymentRequest $orderPaymentRequest): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:1000']]);

        if ($orderPaymentRequest->status !== OrderPaymentRequest::STATUS_PENDING) {
            return response()->json(['message' => __('finance.request_not_pending')], 422);
        }

        $orderPaymentRequest->update([
            'status' => OrderPaymentRequest::STATUS_REJECTED,
            'rejection_reason' => $validated['reason'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $orderPaymentRequest->purchase?->update(['status' => Purchase::STATUS_CANCELLED]);

        return response()->json([
            'message' => __('finance.order_payment_rejected'),
            'data' => $orderPaymentRequest->fresh(['purchase', 'values']),
        ]);
    }
}
