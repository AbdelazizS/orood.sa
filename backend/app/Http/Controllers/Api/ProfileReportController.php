<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfileReport;
use App\Models\User;
use App\Services\Notifications\NotifyStaffNewProfileReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileReportController extends Controller
{
    public function store(Request $request, User $user): JsonResponse
    {
        if ($user->banned_at) {
            return response()->json(['message' => __('User not found.')], 404);
        }

        $authUser = $request->user() ?? $this->resolveTokenUser($request);

        if ($authUser && (int) $authUser->id === (int) $user->id) {
            return response()->json([
                'message' => __('You cannot report your own account.'),
            ], 422);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'reason' => ['nullable', 'string', 'max:255'],
            'email' => $authUser ? ['nullable', 'email', 'max:255'] : ['required', 'email', 'max:255'],
        ]);

        $reporterId = $authUser?->id;
        if ($reporterId && ProfileReport::query()
            ->where('reported_user_id', $user->id)
            ->where('reporter_user_id', $reporterId)
            ->whereIn('status', [ProfileReport::STATUS_NEW, ProfileReport::STATUS_INVESTIGATING])
            ->exists()) {
            return response()->json([
                'message' => __('You already have an active report for this account.'),
            ], 422);
        }

        $report = ProfileReport::create([
            'reported_user_id' => $user->id,
            'reporter_user_id' => $reporterId,
            'email' => $authUser ? ($authUser->email ?? null) : $validated['email'],
            'reason' => $validated['reason'] ?? null,
            'message' => $validated['message'],
            'status' => ProfileReport::STATUS_NEW,
        ]);

        app(NotifyStaffNewProfileReport::class)->notify($report);

        return response()->json([
            'message' => __('Report received. Thank you.'),
            'data' => ['id' => $report->id],
        ], 201);
    }

    private function resolveTokenUser(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $hashedToken = hash('sha256', $token);

        return User::query()
            ->where('api_token', $hashedToken)
            ->where('api_token_expires_at', '>', now())
            ->first();
    }
}
