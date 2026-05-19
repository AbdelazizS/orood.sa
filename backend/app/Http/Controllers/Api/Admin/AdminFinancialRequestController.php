<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinancialRequest;
use App\Models\PaymentMethodField;
use App\Services\Finance\FinancialRequestService;
use App\Services\Finance\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFinancialRequestController extends Controller
{
    public function __construct(
        private readonly FinancialRequestService $service,
        private readonly PaymentMethodService $paymentMethods,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';

        $query = FinancialRequest::query()
            ->with(['user:id,name,email,phone', 'values', 'paymentMethod', 'reviewer:id,name'])
            ->latest('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $paginator = $query->paginate($request->integer('per_page', 25));

        $fieldLabelMap = $this->walletFieldLabelMap($locale);

        $items = collect($paginator->items())->map(
            fn (FinancialRequest $fr) => $this->formatFinancialRequest($fr, $locale, $fieldLabelMap)
        );

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(FinancialRequest $financialRequest): JsonResponse
    {
        $locale = request()->header('Accept-Language') === 'en' ? 'en' : 'ar';
        $financialRequest->load(['user', 'values', 'events.actor', 'paymentMethod']);

        return response()->json([
            'data' => $this->formatFinancialRequest(
                $financialRequest,
                $locale,
                $this->walletFieldLabelMap($locale),
            ),
        ]);
    }

    public function approve(Request $request, FinancialRequest $financialRequest): JsonResponse
    {
        if (! in_array($financialRequest->status, [
            FinancialRequest::STATUS_PENDING,
            FinancialRequest::STATUS_UNDER_REVIEW,
        ], true)) {
            return response()->json(['message' => __('finance.request_not_pending')], 422);
        }

        $validated = $request->validate([
            'approval_note' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        try {
            $updated = $this->service->approve(
                $financialRequest,
                $request->user(),
                $validated['approval_note'],
            );
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_WITHDRAWABLE') {
                return response()->json([
                    'message' => __('wallet.withdrawal_insufficient_for_approval'),
                    'code' => 'INSUFFICIENT_WITHDRAWABLE',
                ], 422);
            }
            throw $e;
        }

        return response()->json([
            'message' => __('finance.request_approved'),
            'data' => $updated,
        ]);
    }

    public function reject(Request $request, FinancialRequest $financialRequest): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if (! in_array($financialRequest->status, [
            FinancialRequest::STATUS_PENDING,
            FinancialRequest::STATUS_UNDER_REVIEW,
        ], true)) {
            return response()->json(['message' => __('finance.request_not_pending')], 422);
        }

        $updated = $this->service->reject($financialRequest, $request->user(), $validated['reason']);

        return response()->json([
            'message' => __('finance.request_rejected'),
            'data' => $updated,
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function walletFieldLabelMap(string $locale): array
    {
        $map = [];
        foreach (['charge', 'withdraw'] as $context) {
            $fields = PaymentMethodField::query()
                ->where('context', $context)
                ->orderBy('sort_order')
                ->get();
            foreach ($fields as $field) {
                $map[$context.'.'.$field->field_key] = $field->localizedLabel($locale);
                $map[$field->field_key] = $field->localizedLabel($locale);
            }
        }

        return $map;
    }

    /**
     * @param  array<string, string>  $fieldLabelMap
     * @return array<string, mixed>
     */
    private function formatFinancialRequest(
        FinancialRequest $fr,
        string $locale,
        array $fieldLabelMap,
    ): array {
        $method = $fr->paymentMethod;
        $context = $fr->type === FinancialRequest::TYPE_WALLET_CHARGE ? 'charge' : 'withdraw';

        $values = $fr->values->map(function ($row) use ($fieldLabelMap, $context) {
            $label = $fieldLabelMap[$context.'.'.$row->field_key]
                ?? $fieldLabelMap[$row->field_key]
                ?? $row->field_key;

            return [
                'field_key' => $row->field_key,
                'label' => $label,
                'value_text' => $row->value_text,
                'file_url' => $row->file_url,
                'value_json' => $row->value_json,
            ];
        })->values()->all();

        return [
            'id' => $fr->id,
            'type' => $fr->type,
            'status' => $fr->status,
            'amount' => $fr->amount !== null ? (float) $fr->amount : null,
            'currency' => $fr->currency,
            'submitted_at' => $fr->submitted_at,
            'user' => $fr->user ? [
                'id' => $fr->user->id,
                'name' => $fr->user->name,
                'email' => $fr->user->email,
                'phone' => $fr->user->phone,
            ] : null,
            'payment_method' => $method ? [
                'id' => $method->id,
                'code' => $method->code,
                'name' => $method->localizedName($locale),
            ] : null,
            'values' => $values,
        ];
    }
}
