<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\DocumentVerification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminVerificationController extends Controller
{
    /**
     * List pending document verifications.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DocumentVerification::with('user')
            ->where('status', DocumentVerification::STATUS_PENDING)
            ->orderByDesc('created_at');

        $verifications = $query->paginate(20);

        return response()->json([
            'data' => $verifications->items(),
            'meta' => [
                'current_page' => $verifications->currentPage(),
                'last_page' => $verifications->lastPage(),
                'total' => $verifications->total(),
            ],
        ]);
    }

    /**
     * Approve a document verification.
     */
    public function approve(Request $request, DocumentVerification $document_verification): JsonResponse
    {
        $verification = $document_verification;
        if ($verification->status !== DocumentVerification::STATUS_PENDING) {
            return response()->json(['message' => 'Verification already processed'], 422);
        }

        $user = $verification->user;

        $verification->update([
            'status' => DocumentVerification::STATUS_APPROVED,
            'verified_at' => now(),
        ]);

        $level = match ($verification->type) {
            DocumentVerification::TYPE_COMPANY_LICENSE => 'company_verified',
            DocumentVerification::TYPE_ID_CARD, DocumentVerification::TYPE_ABSHER => 'id_verified',
            default => 'email',
        };

        $user->update([
            'verification_level' => $level,
            'is_verified' => true,
        ]);

        if ($verification->type === DocumentVerification::TYPE_COMPANY_LICENSE) {
            $name = $verification->company_name ?? $user->name;
            $slug = Str::slug($name) . '-' . $user->id;
            $company = Company::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $name,
                    'slug' => $slug,
                    'license_url' => $verification->document_url,
                    'verification_status' => 'verified',
                ]
            );
        }

        return response()->json([
            'message' => __('Verification approved.'),
            'data' => $verification->fresh('user'),
        ]);
    }

    /**
     * Reject a document verification.
     */
    public function reject(Request $request, DocumentVerification $document_verification): JsonResponse
    {
        $verification = $document_verification;
        if ($verification->status !== DocumentVerification::STATUS_PENDING) {
            return response()->json(['message' => 'Verification already processed'], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $verification->update([
            'status' => DocumentVerification::STATUS_REJECTED,
            'rejected_reason' => $validated['reason'] ?? 'Rejected by admin',
        ]);

        return response()->json([
            'message' => __('Verification rejected.'),
            'data' => $verification->fresh('user'),
        ]);
    }
}
