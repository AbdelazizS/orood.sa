<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Services\Finance\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentConfigController extends Controller
{
    public function __construct(private readonly PaymentMethodService $paymentMethods) {}

    public function fields(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'context' => ['required', 'string', 'max:64'],
            'payment_method_code' => ['nullable', 'string', 'max:64'],
        ]);

        $method = null;
        if (! empty($validated['payment_method_code'])) {
            $method = $this->paymentMethods->getByCode($validated['payment_method_code']);
        }

        $fields = $this->paymentMethods->fieldsForContext($method, $validated['context']);

        return response()->json([
            'data' => $fields->map(fn ($f) => [
                'id' => $f->id,
                'field_key' => $f->field_key,
                'field_type' => $f->field_type,
                'label' => $f->localizedLabel($request->header('Accept-Language')),
                'placeholder' => $request->header('Accept-Language') === 'en' ? $f->placeholder_en : $f->placeholder_ar,
                'help' => $request->header('Accept-Language') === 'en' ? $f->help_en : $f->help_ar,
                'required' => $f->required,
                'options' => $f->options,
                'sort_order' => $f->sort_order,
            ]),
        ]);
    }

    public function methods(Request $request): JsonResponse
    {
        $context = $request->query('context', 'checkout');
        $audience = $request->query('audience');

        $methods = $this->paymentMethods->enabledForContext($context, $audience);

        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';

        return response()->json([
            'data' => $methods->map(fn ($m) => [
                'id' => $m->id,
                'code' => $m->code,
                'name' => $m->localizedName($locale),
                'description' => $locale === 'en' ? $m->description_en : $m->description_ar,
                'min_amount' => $m->min_amount !== null ? (float) $m->min_amount : null,
                'max_amount' => $m->max_amount !== null ? (float) $m->max_amount : null,
                'requires_admin_review' => $m->requires_admin_review,
                'requires_buyer_acknowledgement' => $m->requires_buyer_acknowledgement,
                'instructions' => $m->instructions,
                'processing_time' => $locale === 'en' ? $m->processing_time_en : $m->processing_time_ar,
            ]),
        ]);
    }
}
