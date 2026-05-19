<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProfileResource;
use App\Http\Resources\ReviewResource;
use App\Models\PageVisit;
use App\Models\Review;
use App\Models\User;
use App\Services\CompanyLocationSyncService;
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
            ->with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->withCount(['bids as pending_bids_count' => fn ($q) => $q->where('status', 'PENDING')])
            ->orderByDesc('bumped_at')
            ->limit(20)
            ->get();

        $this->hydrateListingViewerFlags($request, $listings);

        $reviews = $user->reviews()
            ->where('is_visible', true)
            ->with('reviewer')
            ->latest()
            ->limit(10)
            ->get();

        $distribution = $user->getRatingDistribution();
        $company = $user->company;
        if ($company) {
            $company = app(CompanyLocationSyncService::class)->ensureCompanyMatchesUser($company);
        }

        $locale = $request->header('Accept-Language', 'ar');

        $myReview = $request->user()
            ? Review::where('reviewer_id', $request->user()->id)
                ->where('reviewee_id', $user->id)
                ->first()
            : null;

        $user->setAttribute('listings_count', $user->products()->where('status', 'published')->count());
        $user->loadExists([
            'purchasesAsBuyer as has_buyer_purchases',
            'bids as has_bids',
            'viewRequestsAsRequester as has_view_requests',
        ]);
        $user->setAttribute(
            'has_buyer_activity',
            (bool) ($user->has_buyer_purchases || $user->has_bids || $user->has_view_requests)
        );

        return response()->json([
            'user' => new ProfileResource($user),
            'listings' => ProductResource::collection($listings),
            'reviews' => ReviewResource::collection($reviews),
            'review_summary' => [
                'average' => round((float) $user->rating, 1),
                'total' => $user->total_ratings,
                'distribution' => $distribution,
            ],
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'city' => $company->city?->getLocalizedName($locale),
                'product_types' => $company->product_types,
                'is_verified' => $company->verification_status === 'approved',
                'can_post_wholesale' => $company->verification_status === 'approved',
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

        return $this->listingsForUser($request, $user);
    }

    /**
     * GET /profile/{username}/listings — Paginated listings.
     */
    public function listings(Request $request, string $username): JsonResponse
    {
        $user = User::where('username', $username)
            ->whereNull('banned_at')
            ->firstOrFail();

        return $this->listingsForUser($request, $user);
    }

    private function listingsForUser(Request $request, User $user): JsonResponse
    {
        $listings = $user->products()
            ->where('status', 'published')
            ->where(function ($q) {
                $q->where('moderation_status', 'approved')->orWhereNull('moderation_status');
            })
            ->with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->orderByDesc('bumped_at')
            ->paginate(12);

        $this->hydrateListingViewerFlags($request, $listings->getCollection());

        return response()->json([
            'listings' => ProductResource::collection($listings->items()),
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

        return $this->reviewsForUser($request, $user);
    }

    /**
     * GET /profile/{username}/reviews — Paginated reviews.
     */
    public function reviews(Request $request, string $username): JsonResponse
    {
        $user = User::where('username', $username)->firstOrFail();

        return $this->reviewsForUser($request, $user);
    }

    private function reviewsForUser(Request $request, User $user): JsonResponse
    {
        $reviews = $user->reviews()
            ->where('is_visible', true)
            ->with('reviewer')
            ->withReactionCounts()
            ->latest()
            ->paginate(10);

        Review::loadUserReactionsOnPaginator($reviews, $request->user());

        return response()->json([
            'reviews' => ReviewResource::collection($reviews->items()),
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    /**
     * Match homepage feed serialization ({@see ProductResource}) — viewer-specific flags per listing.
     *
     * @param \Illuminate\Support\Collection|\Illuminate\Database\Eloquent\Collection $listings
     */
    private function hydrateListingViewerFlags(Request $request, $listings): void
    {
        $viewer = $request->user();
        foreach ($listings as $product) {
            $product->is_owner = (bool) ($viewer && $viewer->id === $product->user_id);
        }
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

        $visitorId = $request->user()?->id;
        $ipAddress = $request->ip();
        $userAgent = substr((string) ($request->userAgent() ?? ''), 0, 300);

        dispatch(function () use ($profileId, $source, $visitorId, $ipAddress, $userAgent) {
            try {
                PageVisit::create([
                    'profile_id' => $profileId,
                    'visitor_id' => $visitorId,
                    'source' => $source,
                    'ip_address' => $ipAddress,
                    'user_agent' => $userAgent,
                ]);
            } catch (\Throwable $e) {
                report($e);
            }
        })->afterResponse();
    }
}
