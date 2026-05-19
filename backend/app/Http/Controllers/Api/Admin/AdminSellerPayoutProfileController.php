<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SellerPayoutProfile;
use App\Services\Finance\SellerPayoutProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerPayoutProfileController extends Controller
{
    public function __construct(private readonly SellerPayoutProfileService $profiles) {}

    public function index(Request $request): JsonResponse
    {
        $query = SellerPayoutProfile::query()
            ->with(['user', 'values'])
            ->latest('updated_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(25));
    }

    public function verify(Request $request, SellerPayoutProfile $sellerPayoutProfile): JsonResponse
    {
        $profile = $this->profiles->verify($sellerPayoutProfile, $request->user());

        return response()->json([
            'message' => __('finance.payout_verified'),
            'data' => $profile->load('values', 'user'),
        ]);
    }

    public function reject(Request $request, SellerPayoutProfile $sellerPayoutProfile): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $profile = $this->profiles->reject($sellerPayoutProfile, $request->user(), $validated['reason']);

        return response()->json([
            'message' => __('finance.payout_rejected'),
            'data' => $profile->load('values', 'user'),
        ]);
    }
}
