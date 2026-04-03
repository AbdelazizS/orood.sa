<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ListingCardResource;
use App\Http\Resources\ProfileResource;
use App\Http\Resources\ReviewResource;
use App\Models\PageVisit;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicProfileController extends Controller
{
    /**
     * GET /profile/by-id/{id} — Public profile by user ID (same format as show).
     */
    public function showById(Request $request, int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->whereNull('banned_at')
            ->with(['city.region', 'company.city'])
            ->firstOrFail();

        $this->recordVisit($request, $user->id);

        return $this->buildProfileResponse($request, $user);
    }

    /**
     * GET /profile/{username} — Public profile with listings, reviews, summary.
     */
    public function show(Request $request, string $username): JsonResponse
    {
        $user = User::where('username', $username)
            ->whereNull('banned_at')
            ->with(['city.region', 'company.city'])
            ->firstOrFail();

        $this->recordVisit($request, $user->id);

        return $this->buildProfileResponse($request, $user);
    }

    private function buildProfileResponse(Request $request, User $user): JsonResponse
    {
        $listings = $user->products()
            ->where('status', 'published')
            ->where(function ($q) {
                $q->where('moderation_status', 'approved')->orWhereNull('moderation_status');
            })
            ->with(['category', 'city'])
            ->withCount(['bids as pending_bids_count' => fn ($q) => $q->where('status', 'PENDING')])
            ->orderByDesc('bumped_at')
            ->limit(20)
            ->get();

        $reviews = $user->reviews()
            ->where('is_visible', true)
            ->with('reviewer')
            ->latest()
            ->limit(10)
            ->get();

        $distribution = $user->getRatingDistribution();
        $company = $user->company;

        $myReview = $request->user()
            ? Review::where('reviewer_id', $request->user()->id)
                ->where('reviewee_id', $user->id)
                ->first()
            : null;

        $user->setAttribute('listings_count', $user->products()->where('status', 'published')->count());

        return response()->json([
            'user' => new ProfileResource($user),
            'listings' => ListingCardResource::collection($listings),
            'reviews' => ReviewResource::collection($reviews),
            'review_summary' => [
                'average' => round((float) $user->rating, 1),
                'total' => $user->total_ratings,
                'distribution' => $distribution,
            ],
            'company' => $company ? [
                'name' => $company->name,
                'city' => $company->city?->name_ar ?? $company->city?->name ?? null,
                'product_types' => $company->product_types,
                'is_verified' => $company->verification_status === 'approved',
            ] : null,
            'my_review' => $myReview ? new ReviewResource($myReview->load('reviewer')) : null,
        ]);
    }

    /**
     * GET /profile/by-id/{id}/listings — Paginated listings by user ID.
     */
    public function listingsById(Request $request, int $id): JsonResponse
    {
        $user = User::where('id', $id)->whereNull('banned_at')->firstOrFail();

        return $this->listingsForUser($user);
    }

    /**
     * GET /profile/{username}/listings — Paginated listings.
     */
    public function listings(Request $request, string $username): JsonResponse
    {
        $user = User::where('username', $username)
            ->whereNull('banned_at')
            ->firstOrFail();

        return $this->listingsForUser($user);
    }

    private function listingsForUser(User $user): JsonResponse
    {
        $listings = $user->products()
            ->where('status', 'published')
            ->where(function ($q) {
                $q->where('moderation_status', 'approved')->orWhereNull('moderation_status');
            })
            ->with(['category', 'city'])
            ->orderByDesc('bumped_at')
            ->paginate(12);

        return response()->json([
            'listings' => ListingCardResource::collection($listings->items()),
            'pagination' => [
                'current_page' => $listings->currentPage(),
                'last_page' => $listings->lastPage(),
                'total' => $listings->total(),
            ],
        ]);
    }

    /**
     * GET /profile/by-id/{id}/reviews — Paginated reviews by user ID.
     */
    public function reviewsById(Request $request, int $id): JsonResponse
    {
        $user = User::where('id', $id)->firstOrFail();

        return $this->reviewsForUser($user);
    }

    /**
     * GET /profile/{username}/reviews — Paginated reviews.
     */
    public function reviews(Request $request, string $username): JsonResponse
    {
        $user = User::where('username', $username)->firstOrFail();

        return $this->reviewsForUser($user);
    }

    private function reviewsForUser(User $user): JsonResponse
    {
        $reviews = $user->reviews()
            ->where('is_visible', true)
            ->with('reviewer')
            ->latest()
            ->paginate(10);

        return response()->json([
            'reviews' => ReviewResource::collection($reviews->items()),
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    private function recordVisit(Request $request, int $profileId): void
    {
        if ($request->user()?->id === $profileId) {
            return;
        }

        $referrer = $request->header('Referer', '');
        $source = match (true) {
            str_contains($referrer, 'facebook') => 'facebook',
            str_contains($referrer, 'twitter') || str_contains($referrer, 'x.com') => 'twitter',
            str_contains($referrer, 'whatsapp') => 'whatsapp',
            str_contains($referrer, 'linkedin') => 'linkedin',
            str_contains($referrer, 'youtube') => 'youtube',
            $referrer === '' => 'direct',
            default => 'other',
        };

        dispatch(function () use ($request, $profileId, $source) {
            try {
                PageVisit::create([
                    'profile_id' => $profileId,
                    'visitor_id' => $request->user()?->id,
                    'source' => $source,
                    'ip_address' => $request->ip(),
                    'user_agent' => substr($request->userAgent() ?? '', 0, 300),
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        })->afterResponse();
    }
}
