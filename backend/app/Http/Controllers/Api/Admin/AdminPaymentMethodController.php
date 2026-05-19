<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodField;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPaymentMethodController extends Controller
{
    private const WALLET_CODES = ['bank_transfer', 'wallet_withdraw_bank', 'stc_pay'];

    public function __construct(private readonly AuditLogService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $context = $request->query('context');

        $query = PaymentMethod::query()
            ->orderBy('sort_order')
            ->with(['fields' => fn ($q) => $q->orderBy('sort_order')]);

        if ($context === 'charge') {
            $query->whereHas('fields', fn ($q) => $q->where('context', 'charge'));
        } elseif ($context === 'withdraw') {
            $query->where(function ($q) {
                $q->whereHas('fields', fn ($inner) => $inner->where('context', 'withdraw'))
                    ->orWhereIn('code', self::WALLET_CODES);
            });
        } elseif ($context === 'payout_profile') {
            $query->whereHas('fields', fn ($q) => $q->where('context', 'payout_profile'));
        } elseif ($context === 'order_payment') {
            $query->whereHas('fields', fn ($q) => $q->where('context', 'order_payment'));
        }

        $query->where('code', '!=', 'stc_pay');

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:64', 'unique:payment_methods,code'],
            'name_ar' => ['required', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'audience' => ['sometimes', 'in:buyer,seller,both'],
            'enabled' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'max_amount' => ['nullable', 'numeric', 'min:0'],
            'instructions' => ['nullable', 'array'],
        ]);

        $method = PaymentMethod::create($validated);
        $this->audit->log('finance.payment_method.created', $method, null, $method->toArray(), $request->user()?->id);

        return response()->json(['data' => $method], 201);
    }

    public function update(Request $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $before = $paymentMethod->toArray();
        $validated = $request->validate([
            'name_ar' => ['sometimes', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'description_ar' => ['nullable', 'string'],
            'description_en' => ['nullable', 'string'],
            'enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'requires_admin_review' => ['sometimes', 'boolean'],
            'requires_buyer_acknowledgement' => ['sometimes', 'boolean'],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'max_amount' => ['nullable', 'numeric', 'min:0'],
            'instructions' => ['nullable', 'array'],
            'config' => ['nullable', 'array'],
            'processing_time_ar' => ['nullable', 'string', 'max:255'],
            'processing_time_en' => ['nullable', 'string', 'max:255'],
            'audience_roles' => ['nullable', 'array'],
        ]);

        $paymentMethod->update($validated);
        $this->audit->log('finance.payment_method.updated', $paymentMethod, $before, $paymentMethod->fresh()->toArray(), $request->user()?->id);

        return response()->json([
            'message' => __('finance.payment_method_updated'),
            'data' => $paymentMethod->fresh('fields'),
        ]);
    }

    public function storeField(Request $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $validated = $request->validate([
            'context' => ['required', 'string', 'max:64'],
            'field_key' => ['required', 'string', 'max:64'],
            'field_type' => ['required', 'string', 'max:32'],
            'label_ar' => ['required', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'placeholder_ar' => ['nullable', 'string'],
            'placeholder_en' => ['nullable', 'string'],
            'help_ar' => ['nullable', 'string'],
            'help_en' => ['nullable', 'string'],
            'required' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
            'validation_rules' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'config_json' => ['nullable', 'array'],
            'is_layout_block' => ['boolean'],
            'block_style' => ['nullable', 'string', 'max:32'],
        ]);

        $field = $paymentMethod->fields()->create($validated);

        return response()->json(['data' => $field], 201);
    }

    public function updateField(Request $request, PaymentMethodField $field): JsonResponse
    {
        $validated = $request->validate([
            'label_ar' => ['sometimes', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'placeholder_ar' => ['nullable', 'string'],
            'placeholder_en' => ['nullable', 'string'],
            'help_ar' => ['nullable', 'string'],
            'help_en' => ['nullable', 'string'],
            'required' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'field_type' => ['sometimes', 'string', 'max:32'],
            'validation_rules' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'config_json' => ['nullable', 'array'],
            'is_layout_block' => ['sometimes', 'boolean'],
            'block_style' => ['nullable', 'string', 'max:32'],
        ]);

        $field->update($validated);

        return response()->json(['data' => $field->fresh()]);
    }

    public function destroyField(PaymentMethodField $field): JsonResponse
    {
        $field->delete();

        return response()->json(['message' => __('finance.field_deleted')]);
    }

    public function reorderFields(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ordered_ids' => ['required', 'array'],
            'ordered_ids.*' => ['integer', 'exists:payment_method_fields,id'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ordered_ids'] as $index => $id) {
                PaymentMethodField::where('id', $id)->update(['sort_order' => $index + 1]);
            }
        });

        return response()->json(['message' => __('finance.fields_reordered')]);
    }
}
