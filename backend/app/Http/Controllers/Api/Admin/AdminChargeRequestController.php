<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\ChargeRequest;
use App\Models\FinancialRequest;
use App\Models\Notification;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodField;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Finance\FinancialRequestService;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdminChargeRequestController extends Controller
{
    public function __construct(private readonly FinancialRequestService $financialRequestService) {}

    public function index(Request $request): JsonResponse
    {
        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';
        $status = $request->query('status', ChargeRequest::STATUS_PENDING);
        $query = ChargeRequest::with([
            'user:id,name,email,phone',
            'reviewer:id,name',
            'financialRequest.values',
            'financialRequest.paymentMethod',
        ])->orderByDesc('created_at');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $rows = $query->paginate(min((int) $request->get('per_page', 20), 50));
        $fieldLabelMap = $this->chargeFieldLabelMap($locale);

        $data = collect($rows->items())->map(
            fn (ChargeRequest $row) => $this->formatChargeRequest($row, $locale, $fieldLabelMap)
        )->values();

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

        $validated = $request->validate([
            'approval_note' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $admin = $request->user();

        try {
            $linked = FinancialRequest::query()
                ->where('legacy_charge_request_id', $chargeRequest->id)
                ->first();

            if ($linked) {
                $this->financialRequestService->approve(
                    $linked,
                    $admin,
                    $validated['approval_note'],
                );
            } else {
                $amount = (float) $chargeRequest->amount;
                DB::transaction(function () use ($chargeRequest, $admin, $amount, $validated) {
                    $balance = Balance::getOrCreateForUser($chargeRequest->user_id);
                    $balance->increment('available', $amount);
                    $balance->increment('withdrawable', $amount);

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
                            'approval_note' => $validated['approval_note'],
                        ],
                    ]);

                    $chargeRequest->update([
                        'status' => ChargeRequest::STATUS_APPROVED,
                        'reviewed_by' => $admin->id,
                        'reviewed_at' => now(),
                    ]);
                });
            }
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

        $reason = $validated['reason'] ?? '';
        $chargeRequest->update([
            'status' => ChargeRequest::STATUS_REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason ?: null,
        ]);

        $linked = FinancialRequest::query()
            ->where('legacy_charge_request_id', $chargeRequest->id)
            ->whereIn('status', [FinancialRequest::STATUS_PENDING, FinancialRequest::STATUS_UNDER_REVIEW])
            ->first();
        if ($linked) {
            $this->financialRequestService->reject($linked, $request->user(), $reason ?: __('finance.request_rejected'));
        }

        $chargeRequest->refresh();
        if ($member = User::query()->find($chargeRequest->user_id)) {
            Notification::create(InAppNotificationPayload::chargeRequestRejectedForMember($chargeRequest, $member));
        }

        return response()->json([
            'message' => __('wallet.charge_request_rejected'),
            'data' => $chargeRequest->fresh(['user', 'reviewer']),
        ]);
    }

    private function normalizeAssetUrl(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }
        $url = trim($url);
        if ($url === '') {
            return null;
        }
        if (preg_match('#^https?://#i', $url)) {
            return $url;
        }
        if (str_starts_with($url, '/storage/')) {
            return $url;
        }
        if (str_starts_with($url, 'storage/')) {
            return '/'.$url;
        }
        if (str_starts_with($url, '/uploads/') || str_starts_with($url, 'uploads/')) {
            $path = str_starts_with($url, '/') ? $url : '/'.$url;

            return '/storage'.$path;
        }

        return str_starts_with($url, '/') ? $url : '/'.$url;
    }

    /**
     * @return array<string, string>
     */
    private function chargeFieldLabelMap(string $locale): array
    {
        $map = [];
        $fields = PaymentMethodField::query()
            ->where('context', 'charge')
            ->orderBy('sort_order')
            ->get();
        foreach ($fields as $field) {
            $map[$field->field_key] = $field->localizedLabel($locale);
        }

        return $map;
    }

    /**
     * @param  array<string, string>  $fieldLabelMap
     * @return array<string, mixed>
     */
    private function formatChargeRequest(ChargeRequest $row, string $locale, array $fieldLabelMap): array
    {
        $fr = $row->financialRequest;
        $method = $fr?->paymentMethod;
        if (! $method && $row->payment_method) {
            $method = PaymentMethod::query()->where('code', $row->payment_method)->first();
        }

        $values = [];
        if ($fr && $fr->values->isNotEmpty()) {
            foreach ($fr->values as $valueRow) {
                $fileUrl = $this->normalizeAssetUrl($valueRow->file_url)
                    ?? $this->normalizeAssetUrl(
                        in_array($valueRow->field_key, ['receipt_url', 'file_url'], true)
                            ? ($valueRow->value_text ?: null)
                            : null
                    );
                $values[] = [
                    'field_key' => $valueRow->field_key,
                    'label' => $fieldLabelMap[$valueRow->field_key] ?? $valueRow->field_key,
                    'value_text' => in_array($valueRow->field_key, ['receipt_url', 'file_url'], true)
                        ? null
                        : $valueRow->value_text,
                    'file_url' => $fileUrl,
                    'value_json' => $valueRow->value_json,
                ];
            }
        } else {
            $legacy = [
                'payer_bank_name' => $row->payer_bank_name,
                'transfer_reference' => $row->transfer_reference,
                'receipt_url' => $row->receipt_url,
                'note' => $row->note,
            ];
            foreach ($legacy as $key => $val) {
                if ($val === null || $val === '') {
                    continue;
                }
                $values[] = [
                    'field_key' => $key,
                    'label' => $fieldLabelMap[$key] ?? $key,
                    'value_text' => in_array($key, ['receipt_url'], true) ? null : (string) $val,
                    'file_url' => $key === 'receipt_url' ? $this->normalizeAssetUrl((string) $val) : null,
                    'value_json' => null,
                ];
            }
        }

        return [
            'id' => $row->id,
            'financial_request_id' => $fr?->id,
            'user_id' => $row->user_id,
            'amount' => (float) $row->amount,
            'payment_method' => $row->payment_method,
            'payment_method_label' => $method?->localizedName($locale) ?? $row->payment_method,
            'payer_bank_name' => $row->payer_bank_name,
            'transfer_reference' => $row->transfer_reference,
            'receipt_url' => $this->normalizeAssetUrl($row->receipt_url),
            'note' => $row->note,
            'submitted_at' => $row->submitted_at,
            'status' => $row->status,
            'rejection_reason' => $row->rejection_reason,
            'reviewed_at' => $row->reviewed_at,
            'values' => $values,
            'user' => $row->user ? [
                'id' => $row->user->id,
                'name' => $row->user->name,
                'email' => $row->user->email,
                'phone' => $row->user->phone,
            ] : null,
        ];
    }
}
