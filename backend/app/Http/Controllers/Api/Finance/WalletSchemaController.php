<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Services\Finance\PaymentMethodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletSchemaController extends Controller
{
    public function __construct(private readonly PaymentMethodService $paymentMethods) {}

    public function chargeSchema(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->buildWalletContextSchema($request, 'charge'),
        ]);
    }

    public function withdrawSchema(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->buildWalletContextSchema($request, 'withdraw'),
        ]);
    }

    /**
     * @return array{methods: array<int, array<string, mixed>>, currency: string}
     */
    protected function buildWalletContextSchema(Request $request, string $context): array
    {
        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';
        $methods = $this->paymentMethods->enabledForWalletContext($context);

        return [
            'currency' => 'SAR',
            'methods' => $methods->map(function (PaymentMethod $method) use ($request, $context, $locale) {
                $fields = $this->paymentMethods->fieldsForContext($method, $context);

                return [
                    'id' => $method->id,
                    'code' => $method->code,
                    'name' => $method->localizedName($locale),
                    'description' => $locale === 'en' ? $method->description_en : $method->description_ar,
                    'min_amount' => $method->min_amount !== null ? (float) $method->min_amount : null,
                    'max_amount' => $method->max_amount !== null ? (float) $method->max_amount : null,
                    'requires_admin_review' => $method->requires_admin_review,
                    'processing_time' => $locale === 'en' ? $method->processing_time_en : $method->processing_time_ar,
                    'instructions' => $method->instructions,
                    'fields' => $fields->map(fn ($f) => $this->paymentMethods->serializeField($f, $locale))->values()->all(),
                ];
            })->values()->all(),
        ];
    }
}
