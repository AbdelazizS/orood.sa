<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Finance\PaymentEligibilityEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutPaymentController extends Controller
{
    public function __construct(private readonly PaymentEligibilityEngine $eligibility) {}

    public function options(Request $request, Product $product): JsonResponse
    {
        if (! $product->isPubliclyListed()) {
            abort(404);
        }

        $product->load('seller.sellerPayoutProfile.values');

        return response()->json([
            'data' => $this->eligibility->checkoutPaymentOptions($product, $request->user()),
        ]);
    }
}
