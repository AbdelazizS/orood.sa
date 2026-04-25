<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCompanyVerificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', 'pending');
        $allowed = ['pending', 'approved', 'rejected'];
        if (! in_array($status, $allowed, true)) {
            $status = 'pending';
        }

        $companies = Company::query()
            ->with(['user:id,name,email,phone,role', 'city:id,name,name_ar', 'reviewer:id,name'])
            ->where('verification_status', $status)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($companies);
    }

    public function approve(Request $request, Company $company): JsonResponse
    {
        $admin = $request->user();

        $company->forceFill([
            'verification_status' => 'approved',
            'rejection_reason' => null,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ])->save();

        $user = $company->user;
        if ($user) {
            $user->forceFill([
                'role' => 'company',
                'company_verification_status' => 'approved',
                'company_verification_note' => null,
            ])->save();
        }

        return response()->json([
            'message' => __('verification.company_approved'),
            'data' => ['id' => $company->id, 'status' => 'approved'],
        ]);
    }

    public function reject(Request $request, Company $company): JsonResponse
    {
        $payload = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $admin = $request->user();

        $company->forceFill([
            'verification_status' => 'rejected',
            'rejection_reason' => $payload['reason'],
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ])->save();

        $user = $company->user;
        if ($user) {
            $user->forceFill([
                'company_verification_status' => 'rejected',
                'company_verification_note' => $payload['reason'],
            ])->save();
        }

        return response()->json([
            'message' => __('verification.company_rejected'),
            'data' => ['id' => $company->id, 'status' => 'rejected'],
        ]);
    }
}
