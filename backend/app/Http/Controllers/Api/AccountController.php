<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\ChargeRequest;
use App\Models\PaymentMethod;
use App\Models\DocumentVerification;
use App\Models\Notification;
use App\Models\GuaranteeRequest;
use App\Models\PageVisit;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Transaction;
use App\Models\Bid;
use App\Models\Permission;
use App\Models\WithdrawalRequest;
use App\Support\InAppNotificationPayload;
use App\Services\GuaranteeWallet;
use App\Services\PurchaseFulfillment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    /**
     * Upload document for verification (ID card or company license).
     * Rate limit: 5 attempts per hour.
     */
    public function verifyDocument(Request $request): JsonResponse
    {
        $key = 'verify-document:' . $request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => __('Too many verification attempts. Try again in :minutes minutes.', ['minutes' => ceil($seconds / 60)]),
            ], 429);
        }

        $validated = $request->validate([
            'type' => ['required', 'in:id_card,company_license'],
            'document' => ['required', 'file', 'mimes:pdf,jpeg,jpg,png', 'max:10240'],
            'company_name' => ['required_if:type,company_license', 'nullable', 'string', 'max:255'],
            'company_city' => ['required_if:type,company_license', 'nullable', 'string', 'max:255'],
            'company_product_type' => ['required_if:type,company_license', 'nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // Reject any pending verification of same type
        DocumentVerification::where('user_id', $user->id)
            ->where('type', $validated['type'])
            ->where('status', DocumentVerification::STATUS_PENDING)
            ->update(['status' => DocumentVerification::STATUS_REJECTED, 'rejected_reason' => 'New submission']);

        $file = $request->file('document');
        $name = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('uploads/verifications', $name, 'public');
        $documentUrl = '/storage/' . $path;

        $verification = DocumentVerification::create([
            'user_id' => $user->id,
            'type' => $validated['type'],
            'status' => DocumentVerification::STATUS_PENDING,
            'document_url' => $documentUrl,
            'company_name' => $validated['company_name'] ?? null,
            'company_city' => $validated['company_city'] ?? null,
            'company_product_type' => $validated['company_product_type'] ?? null,
        ]);

        foreach (Permission::userIdsHavingPermission('compliance.review_document_verifications') as $staffUserId) {
            Notification::create(
                InAppNotificationPayload::documentVerificationPendingForStaff((int) $staffUserId, $verification, $user)
            );
        }

        RateLimiter::hit($key, 3600);

        return response()->json([
            'message' => __('Verification submitted. Awaiting admin review.'),
            'data' => $verification,
        ], 201);
    }

    /**
     * Get verification status and badge level.
     */
    public function verificationStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $level = $user->verification_level ?? 'unverified';
        if ($user->email_verified_at) {
            $level = $level === 'unverified' ? 'email' : $level;
        }

        $pending = DocumentVerification::where('user_id', $user->id)
            ->where('status', DocumentVerification::STATUS_PENDING)
            ->latest()
            ->first();

        $rejected = DocumentVerification::where('user_id', $user->id)
            ->where('status', DocumentVerification::STATUS_REJECTED)
            ->latest()
            ->first();

        $badge = match ($level) {
            'company_verified' => 'blue',
            'id_verified' => 'gold',
            'email' => 'green',
            default => 'grey',
        };

        return response()->json([
            'data' => [
                'verification_level' => $level,
                'badge' => $badge,
                'pending' => $pending ? [
                    'id' => $pending->id,
                    'type' => $pending->type,
                    'submitted_at' => $pending->created_at,
                ] : null,
                'rejected' => $rejected ? [
                    'reason' => $rejected->rejected_reason,
                    'at' => $rejected->updated_at,
                ] : null,
            ],
        ]);
    }

    /**
     * Absher verification placeholder.
     */
    public function verifyAbsher(Request $request): JsonResponse
    {
        return response()->json([
            'message' => __('Absher integration coming soon.'),
        ], 501);
    }

    /**
     * List current user's financial guarantee requests (deposit / refund).
     */
    public function guaranteeRequestsIndex(Request $request): JsonResponse
    {
        $rows = GuaranteeRequest::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json(['data' => $rows]);
    }

    /**
     * Submit a deposit or refund request (requires admin approval).
     */
    public function guaranteeRequestsStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:deposit,refund'],
            'amount' => ['required_if:type,deposit', 'nullable', 'numeric', 'min:100'],
        ]);

        $user = $request->user();

        $hasPending = GuaranteeRequest::query()
            ->where('user_id', $user->id)
            ->where('status', GuaranteeRequest::STATUS_PENDING)
            ->exists();

        if ($hasPending) {
            return response()->json([
                'message' => __('You already have a pending guarantee request.'),
            ], 422);
        }

        if ($validated['type'] === GuaranteeRequest::TYPE_REFUND) {
            if ((float) ($user->financial_guarantee ?? 0) <= 0) {
                return response()->json(['message' => __('No guarantee to refund.')], 422);
            }

            $row = GuaranteeRequest::create([
                'user_id' => $user->id,
                'type' => GuaranteeRequest::TYPE_REFUND,
                'amount' => null,
                'status' => GuaranteeRequest::STATUS_PENDING,
            ]);

            foreach (Permission::userIdsHavingPermission('compliance.review_guarantee_requests') as $staffUserId) {
                Notification::create(
                    InAppNotificationPayload::guaranteeRequestPendingForStaff((int) $staffUserId, $row, $user)
                );
            }

            return response()->json([
                'message' => __('Refund request submitted. Awaiting admin approval.'),
                'data' => $row,
            ], 201);
        }

        $amount = (float) $validated['amount'];

        $row = GuaranteeRequest::create([
            'user_id' => $user->id,
            'type' => GuaranteeRequest::TYPE_DEPOSIT,
            'amount' => $amount,
            'status' => GuaranteeRequest::STATUS_PENDING,
        ]);

        foreach (Permission::userIdsHavingPermission('compliance.review_guarantee_requests') as $staffUserId) {
            Notification::create(
                InAppNotificationPayload::guaranteeRequestPendingForStaff((int) $staffUserId, $row, $user)
            );
        }

        return response()->json([
            'message' => __('Deposit request submitted. Awaiting admin approval.'),
            'data' => $row,
        ], 201);
    }

    /**
     * Get guarantee status.
     */
    public function guaranteeStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $amount = (float) ($user->financial_guarantee ?? 0);
        $pendingAsSeller = Purchase::where('seller_id', $user->id)
            ->whereIn('status', ['pending', 'cod_requested', 'awaiting_payment', 'shipped', 'delivered'])
            ->exists();

        return response()->json([
            'data' => [
                'amount' => $amount,
                'status' => $amount > 0 ? 'active' : 'none',
                'can_refund' => $amount > 0 && !$pendingAsSeller,
            ],
        ]);
    }

    /**
     * Get balance (available, escrow, financial_guarantee).
     */
    public function balance(Request $request): JsonResponse
    {
        $user = $request->user();
        $balance = Balance::getOrCreateForUser($user->id);
        $guarantee = (float) ($user->financial_guarantee ?? 0);

        $pendingWithdrawals = (float) WithdrawalRequest::where('user_id', $user->id)
            ->where('status', WithdrawalRequest::STATUS_PENDING)
            ->sum('amount');
        $pendingCharges = (float) ChargeRequest::where('user_id', $user->id)
            ->where('status', ChargeRequest::STATUS_PENDING)
            ->sum('amount');

        return response()->json([
            'data' => [
                'available' => (float) $balance->available,
                'escrow' => (float) $balance->escrow,
                'withdrawable' => (float) ($balance->withdrawable ?? 0),
                'financial_guarantee' => $guarantee,
                'pending_withdrawals' => $pendingWithdrawals,
                'pending_charges' => $pendingCharges,
                'bank_transfer' => $this->walletBankTransferInstructions(),
            ],
        ]);
    }

    /**
     * Charge balance (add funds).
     * Creates Transaction and updates balance. Payment gateway integration can be added later.
     */
    public function charge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:10'],
            'payment_method' => ['nullable', 'string', 'in:card,mada,apple_pay,voucher'],
            'payer_bank_name' => ['required', 'string', 'max:255'],
            'transfer_reference' => ['required', 'string', 'max:255'],
            'receipt_url' => ['nullable', 'string', 'max:500'],
            'note' => ['nullable', 'string', 'max:2000'],
            'idempotency_key' => ['nullable', 'string', 'max:191'],
        ]);

        $user = $request->user();
        $amount = (float) $validated['amount'];
        $idempotencyKey = $request->header('Idempotency-Key')
            ?: ($validated['idempotency_key'] ?? null);
        if ($idempotencyKey !== null && strlen($idempotencyKey) < 8) {
            return response()->json(['message' => __('wallet.idempotency_key_min_length')], 422);
        }

        if ($idempotencyKey) {
            $existing = ChargeRequest::where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return response()->json([
                    'message' => __('wallet.charge_submitted'),
                    'data' => [
                        'charge_request' => $existing,
                        'idempotent_replay' => true,
                    ],
                ], 200);
            }
        }

        $chargeRequest = ChargeRequest::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'payment_method' => $validated['payment_method'] ?? null,
            'payer_bank_name' => $validated['payer_bank_name'],
            'transfer_reference' => $validated['transfer_reference'],
            'receipt_url' => $validated['receipt_url'] ?? null,
            'note' => $validated['note'] ?? null,
            'submitted_at' => now(),
            'status' => ChargeRequest::STATUS_PENDING,
            'idempotency_key' => $idempotencyKey,
        ]);

        foreach (Permission::userIdsHavingPermission('finance.approve_charge') as $financeUserId) {
            Notification::create(
                InAppNotificationPayload::chargeRequestPendingForStaff((int) $financeUserId, $chargeRequest, $user)
            );
        }

        return response()->json([
            'message' => __('wallet.charge_submitted'),
            'data' => [
                'charge_request' => $chargeRequest,
                'status' => 'pending_review',
            ],
        ], 201);
    }

    /**
     * Dashboard home — single endpoint with all data for /dashboard.
     */
    public function dashboardHome(Request $request): JsonResponse
    {
        $user = $request->user();
        $balance = Balance::getOrCreateForUser($user->id);
        $productIds = Product::where('user_id', $user->id)->pluck('id');
        $convIds = \App\Models\Conversation::where('buyer_id', $user->id)->orWhere('seller_id', $user->id)->pluck('id');

        $todayStart = now()->startOfDay();
        $weekStart = now()->startOfWeek(6); // Saturday for Saudi

        [
            $activeListings,
            $soldListings,
            $hiddenListings,
            $pendingOrdersSeller,
            $confirmedOrdersSeller,
            $completedOrdersSeller,
            $unreadMessages,
            $unreadNotifications,
            $todayViews,
            $weekViews,
            $pendingBids,
        ] = [
            Product::where('user_id', $user->id)->where('status', 'published')->count(),
            Product::where('user_id', $user->id)->where('status', 'sold')->count(),
            Product::where('user_id', $user->id)->where('status', 'hidden')->count(),
            Purchase::where('seller_id', $user->id)->whereIn('status', [
                Purchase::STATUS_PENDING,
                Purchase::STATUS_COD_REQUESTED,
            ])->count(),
            Purchase::where('seller_id', $user->id)->whereIn('status', [
                Purchase::STATUS_AWAITING_PAYMENT,
                Purchase::STATUS_SHIPPED,
                Purchase::STATUS_DELIVERED,
            ])->count(),
            Purchase::where('seller_id', $user->id)->whereIn('status', [Purchase::STATUS_COMPLETED])->count(),
            \App\Models\Message::whereIn('conversation_id', $convIds)->where('user_id', '!=', $user->id)->where('read', false)->count(),
            Notification::where('user_id', $user->id)->whereNull('read_at')->count(),
            PageVisit::where('profile_id', $user->id)->where('created_at', '>=', $todayStart)->count(),
            PageVisit::whereIn('product_id', $productIds)->where('created_at', '>=', $weekStart)->count(),
            \App\Models\Bid::whereIn('product_id', $productIds)->where('status', 'PENDING')->count(),
        ];

        $recentOrders = Purchase::with(['product', 'buyer', 'seller'])
            ->where(function ($q) use ($user) {
                $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id);
            })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($p) => $this->formatDashboardOrder($p, $user->id));

        $recentNotifications = Notification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body ?? '',
                'data' => $n->data,
                'isRead' => $n->read_at !== null,
                'link' => ($n->data ?? [])['link'] ?? null,
                'createdAt' => $n->created_at,
            ]);

        $recentListings = Product::where('user_id', $user->id)
            ->where('status', 'published')
            ->orderByDesc('bumped_at')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'title' => $p->title,
                'price' => (float) ($p->price ?? 0),
                'status' => $p->status,
                'viewCount' => (int) ($p->view_count ?? 0),
                'todayViewCount' => (int) ($p->today_view_count ?? 0),
                'messageCount' => (int) ($p->message_count ?? 0),
                'soldCount' => 0,
                'createdAt' => $p->created_at,
                'bumpedAt' => $p->bumped_at,
                'images' => $this->productImages($p),
            ]);

        $viewsLast7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $viewsLast7Days[] = PageVisit::whereIn('product_id', $productIds)
                ->whereDate('created_at', $day)
                ->count();
        }

        $username = $user->username ?? $user->name ?? (string) $user->id;

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'username' => $username,
                    'name' => $user->name,
                    'avatarUrl' => $user->avatar_url,
                    'coverUrl' => $user->cover_photo_url,
                    'isVerified' => (bool) ($user->is_verified ?? false),
                    'verificationMethod' => $user->verification_method,
                    'rating' => (float) ($user->rating ?? 0),
                    'completedOrders' => (int) ($user->completed_orders ?? 0),
                    'createdAt' => $user->created_at,
                ],
                'stats' => [
                    'listings' => [
                        'active' => $activeListings,
                        'sold' => $soldListings,
                        'hidden' => $hiddenListings,
                        'total' => $activeListings + $soldListings + $hiddenListings,
                    ],
                    'orders' => [
                        'pending' => $pendingOrdersSeller,
                        'confirmed' => $confirmedOrdersSeller,
                        'completed' => $completedOrdersSeller,
                        'total' => $pendingOrdersSeller + $confirmedOrdersSeller + $completedOrdersSeller,
                    ],
                    'messages' => ['unread' => $unreadMessages],
                    'notifications' => ['unread' => $unreadNotifications],
                    'views' => ['today' => $todayViews, 'thisWeek' => $weekViews],
                    'bids' => ['pending' => $pendingBids],
                    'wallet' => [
                        'balance' => (float) $balance->available,
                        'escrowBalance' => (float) $balance->escrow,
                        'withdrawableBalance' => (float) ($balance->withdrawable ?? 0),
                        'financialGuarantee' => (float) ($user->financial_guarantee ?? 0),
                        'pendingWithdrawals' => (float) WithdrawalRequest::where('user_id', $user->id)->where('status', WithdrawalRequest::STATUS_PENDING)->sum('amount'),
                        'pendingCharges' => (float) ChargeRequest::where('user_id', $user->id)->where('status', ChargeRequest::STATUS_PENDING)->sum('amount'),
                    ],
                ],
                'recentOrders' => $recentOrders,
                'recentNotifications' => $recentNotifications,
                'recentListings' => $recentListings,
                'quickStats' => ['viewsLast7Days' => $viewsLast7Days],
            ],
        ]);
    }

    private function formatDashboardOrder(Purchase $order, int $currentUserId): array
    {
        $product = $order->product;
        $media = is_array($product?->media) ? $product->media : [];
        $imageUrl = $media['cover'] ?? $media['image_url'] ?? $product?->image_url ?? null;

        return [
            'id' => $order->id,
            'order_number' => 'ORD-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
            'created_at' => $order->created_at,
            'status' => $order->status,
            'total' => (float) $order->amount,
            'buyerId' => $order->buyer_id,
            'sellerId' => $order->seller_id,
            'listing' => $product ? [
                'id' => $product->id,
                'title' => $product->title,
                'images' => $imageUrl ? [['url' => $imageUrl]] : [],
            ] : null,
            'buyer' => $order->buyer ? ['id' => $order->buyer->id, 'username' => $order->buyer->username ?? $order->buyer->name] : null,
            'seller' => $order->seller ? ['id' => $order->seller->id, 'username' => $order->seller->username ?? $order->seller->name] : null,
        ];
    }

    private function productImages(Product $product): array
    {
        $media = is_array($product->media) ? $product->media : [];
        $url = $media['cover'] ?? $media['image_url'] ?? $product->image_url ?? null;
        return $url ? [['url' => $url]] : [];
    }

    /**
     * Get user dashboard stats.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $activeListings = \App\Models\Product::where('user_id', $user->id)
            ->where('status', 'published')
            ->count();

        $pendingOrders = Purchase::where(function ($q) use ($user) {
            $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id);
        })->whereIn('status', [
            Purchase::STATUS_PENDING,
            Purchase::STATUS_COD_REQUESTED,
            Purchase::STATUS_AWAITING_PAYMENT,
            Purchase::STATUS_SHIPPED,
            Purchase::STATUS_DELIVERED,
        ])
            ->count();

        $convIds = \App\Models\Conversation::where('buyer_id', $user->id)->orWhere('seller_id', $user->id)->pluck('id');
        $unreadMessages = \App\Models\Message::whereIn('conversation_id', $convIds)
            ->where('read', false)
            ->where('user_id', '!=', $user->id)
            ->count();

        $unreadNotifications = \App\Models\Notification::where('user_id', $user->id)->whereNull('read_at')->count();

        return response()->json([
            'data' => [
                'active_listings' => $activeListings,
                'pending_orders' => $pendingOrders,
                'unread_messages' => $unreadMessages,
                'unread_notifications' => $unreadNotifications,
                'completed_orders' => (int) ($user->completed_orders ?? 0),
                'rating' => (float) ($user->rating ?? 0),
            ],
        ]);
    }

    /**
     * Get visitor stats for user's profile and listings.
     */
    public function visitorStats(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            $requestedTimezone = (string) ($request->header('X-Timezone')
                ?? $request->query('tz')
                ?? 'UTC');
            $timezone = in_array($requestedTimezone, \DateTimeZone::listIdentifiers(), true)
                ? $requestedTimezone
                : 'UTC';
            $localNow = now($timezone);
        } catch (\Throwable) {
            $timezone = 'UTC';
            $localNow = now('UTC');
        }

        $profileVisits = PageVisit::where('profile_id', $user->id);
        $productIds = Product::where('user_id', $user->id)->pluck('id');
        $listingVisits = PageVisit::whereIn('product_id', $productIds);
        $profileVisitsValid = $profileVisits->clone()->whereNotNull('created_at');
        $listingVisitsValid = $listingVisits->clone()->whereNotNull('created_at');

        $nowProfile = $profileVisitsValid->clone()->where('created_at', '>=', now()->subMinutes(5))->count();
        $nowListing = $listingVisitsValid->clone()->where('created_at', '>=', now()->subMinutes(5))->count();

        $todayStartUtc = $localNow->copy()->startOfDay()->utc();
        $todayEndUtc = $localNow->copy()->addDay()->startOfDay()->utc();
        $weekStartUtc = $localNow->copy()->subDays(6)->startOfDay()->utc();
        $monthStartUtc = $localNow->copy()->subDays(29)->startOfDay()->utc();
        $yearStartUtc = $localNow->copy()->subDays(364)->startOfDay()->utc();

        $todayProfile = $profileVisitsValid->clone()
            ->where('created_at', '>=', $todayStartUtc)
            ->where('created_at', '<', $todayEndUtc)
            ->count();
        $weekProfile = $profileVisitsValid->clone()->where('created_at', '>=', $weekStartUtc)->count();
        $monthProfile = $profileVisitsValid->clone()->where('created_at', '>=', $monthStartUtc)->count();
        $yearProfile = $profileVisitsValid->clone()->where('created_at', '>=', $yearStartUtc)->count();

        $todayListing = $listingVisitsValid->clone()
            ->where('created_at', '>=', $todayStartUtc)
            ->where('created_at', '<', $todayEndUtc)
            ->count();
        $weekListing = $listingVisitsValid->clone()->where('created_at', '>=', $weekStartUtc)->count();
        $monthListing = $listingVisitsValid->clone()->where('created_at', '>=', $monthStartUtc)->count();
        $yearListing = $listingVisitsValid->clone()->where('created_at', '>=', $yearStartUtc)->count();

        $nowCombined = $nowProfile + $nowListing;
        $todayCombined = $todayProfile + $todayListing;
        $weekCombined = $weekProfile + $weekListing;
        $monthCombined = $monthProfile + $monthListing;
        $yearCombined = $yearProfile + $yearListing;
        $validVisitsCount = (int) ($profileVisitsValid->clone()->count() + $listingVisitsValid->clone()->count());
        $invalidVisitsWithoutTimestamp = (int) (
            $profileVisits->clone()->whereNull('created_at')->count()
            + $listingVisits->clone()->whereNull('created_at')->count()
        );
        $excludedInternalVisits = (int) (
            $profileVisits->clone()->whereNotNull('visitor_id')->whereColumn('visitor_id', 'profile_id')->count()
            + $listingVisits->clone()->where('visitor_id', $user->id)->count()
        );
        $latestProfileVisitAt = $profileVisitsValid->clone()->max('created_at');
        $latestListingVisitAt = $listingVisitsValid->clone()->max('created_at');
        $lastVisitAtCombined = collect([$latestProfileVisitAt, $latestListingVisitAt])
            ->filter()
            ->sortDesc()
            ->first();

        $sources = ['whatsapp', 'twitter', 'facebook', 'linkedin', 'youtube', 'direct', 'other'];
        $todaySources = $profileVisitsValid->clone()
            ->where('created_at', '>=', $todayStartUtc)
            ->where('created_at', '<', $todayEndUtc)
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();
        $weekSources = $profileVisitsValid->clone()->where('created_at', '>=', $weekStartUtc)
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();
        $monthSources = $profileVisitsValid->clone()->where('created_at', '>=', $monthStartUtc)
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();
        $yearSources = $profileVisitsValid->clone()->where('created_at', '>=', $yearStartUtc)
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();

        $recentVisitors = PageVisit::where('profile_id', $user->id)
            ->whereNotNull('created_at')
            ->with('visitor:id,name,avatar_url')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'username' => $v->visitor?->name ?? __('Guest'),
                'avatar_url' => $v->visitor?->avatar_url,
                'visited_at' => $v->created_at,
            ]);

        $baseUrl = rtrim(config('app.frontend_url', request()->getSchemeAndHttpHost()), '/');
        $shareLink = $baseUrl . '/profile/' . ($user->username ?? $user->name ?? $user->id);

        return response()->json([
            'data' => [
                // Backward-compatible counts (profile page visits only).
                'counts' => ['now' => (int) $nowProfile, 'today' => (int) $todayProfile, 'week' => (int) $weekProfile, 'month' => (int) $monthProfile, 'year' => (int) $yearProfile],
                // Combined scope requested by dashboard: profile page + owned listings.
                'counts_combined' => ['now' => (int) $nowCombined, 'today' => (int) $todayCombined, 'week' => (int) $weekCombined, 'month' => (int) $monthCombined, 'year' => (int) $yearCombined],
                'counts_profile' => ['now' => (int) $nowProfile, 'today' => (int) $todayProfile, 'week' => (int) $weekProfile, 'month' => (int) $monthProfile, 'year' => (int) $yearProfile],
                'counts_listings' => ['now' => (int) $nowListing, 'today' => (int) $todayListing, 'week' => (int) $weekListing, 'month' => (int) $monthListing, 'year' => (int) $yearListing],
                'sources' => [
                    'today' => array_merge(array_fill_keys($sources, 0), $todaySources),
                    'week' => array_merge(array_fill_keys($sources, 0), $weekSources),
                    'month' => array_merge(array_fill_keys($sources, 0), $monthSources),
                    'year' => array_merge(array_fill_keys($sources, 0), $yearSources),
                ],
                'recent_visitors' => $recentVisitors,
                'share_link' => $shareLink,
                'total_visits' => $validVisitsCount,
                'profile_visits' => (int) $profileVisitsValid->clone()->count(),
                'listing_visits' => (int) $listingVisitsValid->clone()->count(),
                'valid_visits_count' => $validVisitsCount,
                'invalid_visits_without_timestamp' => $invalidVisitsWithoutTimestamp,
                'excluded_internal_visits' => $excludedInternalVisits,
                'today_breakdown' => [
                    'profile_today' => (int) $todayProfile,
                    'listings_today' => (int) $todayListing,
                ],
                'last_visit_at_combined' => $lastVisitAtCombined,
                'applied_timezone' => $timezone,
                'window_bounds' => [
                    'today' => ['from_utc' => $todayStartUtc->toIso8601String(), 'to_utc' => $todayEndUtc->toIso8601String()],
                    'week' => ['from_utc' => $weekStartUtc->toIso8601String()],
                    'month' => ['from_utc' => $monthStartUtc->toIso8601String()],
                    'year' => ['from_utc' => $yearStartUtc->toIso8601String()],
                ],
            ],
        ]);
    }

    /**
     * Company verification (alias for document verification with type company_license).
     */
    public function verifyCompany(Request $request): JsonResponse
    {
        $request->merge(['type' => 'company_license']);
        return $this->verifyDocument($request);
    }

    /**
     * Buyer confirms receipt → move escrow to seller available.
     */
    public function confirmReceipt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_id' => ['required', 'integer', 'exists:purchases,id'],
        ]);

        $user = $request->user();
        $purchase = Purchase::findOrFail($validated['purchase_id']);

        if ($purchase->buyer_id !== $user->id) {
            return response()->json(['message' => __('Only the buyer can confirm receipt.')], 403);
        }

        if ($purchase->status === Purchase::STATUS_COMPLETED) {
            return response()->json(['message' => __('Order already completed.')], 422);
        }

        try {
            PurchaseFulfillment::assertBuyerMayConfirmReceipt($purchase);
            PurchaseFulfillment::complete($purchase);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $purchase->refresh()->loadMissing('product');
        \App\Models\Notification::create(
            \App\Support\InAppNotificationPayload::orderStatusForBuyer($purchase, 'order_completed')
        );
        \App\Models\Notification::create(
            \App\Support\InAppNotificationPayload::orderStatusForSeller($purchase, 'order_completed')
        );
        \App\Models\Notification::create(
            \App\Support\InAppNotificationPayload::orderStatusForBuyer($purchase, 'review_eligible')
        );

        return response()->json([
            'message' => __('Receipt confirmed. Funds released to seller.'),
            'data' => $purchase->fresh(['product', 'buyer', 'seller']),
        ]);
    }

    /**
     * Withdraw balance.
     */
    public function withdraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:10'],
            'bank_iban' => ['required', 'string', 'max:50'],
            'bank_name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $balance = Balance::getOrCreateForUser($user->id);
        $amount = (float) $validated['amount'];
        $withdrawable = (float) ($balance->withdrawable ?? 0);
        $pendingSum = (float) WithdrawalRequest::where('user_id', $user->id)
            ->where('status', WithdrawalRequest::STATUS_PENDING)
            ->sum('amount');

        if ($withdrawable - $pendingSum < $amount) {
            return response()->json([
                'message' => __('wallet.insufficient_withdrawable'),
            ], 422);
        }

        $requestRow = WithdrawalRequest::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'bank_iban' => $validated['bank_iban'],
            'bank_name' => $validated['bank_name'],
            'status' => WithdrawalRequest::STATUS_PENDING,
        ]);

        foreach (Permission::userIdsHavingPermission('finance.approve_withdrawal') as $financeUserId) {
            Notification::create(
                InAppNotificationPayload::withdrawalRequestPendingForStaff((int) $financeUserId, $requestRow, $user)
            );
        }

        return response()->json([
            'message' => __('wallet.withdrawal_submitted'),
            'data' => ['success' => true, 'withdrawal_request' => $requestRow],
        ], 201);
    }

    /**
     * List current user's charge requests.
     */
    public function chargeRequests(Request $request): JsonResponse
    {
        $rows = ChargeRequest::where('user_id', $request->user()->id)
            ->with('reviewer:id,name')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $rows]);
    }

    /**
     * List current user's withdrawal requests.
     */
    public function withdrawalRequests(Request $request): JsonResponse
    {
        $rows = WithdrawalRequest::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $rows]);
    }

    /**
     * Get transaction history.
     */
    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('limit', 20), 50);
        $transactions = Transaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Get reports: top listings by metric.
     */
    public function reports(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['nullable', 'string', 'in:week,month,year'],
            'metric' => ['nullable', 'string', 'in:views,comments,messages,sales,bids'],
        ]);

        $user = $request->user();
        $period = $validated['period'] ?? 'month';
        $metric = $validated['metric'] ?? null;

        $productIds = Product::where('user_id', $user->id)->pluck('id');
        if ($productIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $since = match ($period) {
            'week' => now()->subWeek(),
            'year' => now()->subYear(),
            default => now()->subMonth(),
        };

        $metrics = $metric ? [$metric] : ['views', 'comments', 'messages', 'sales', 'bids'];
        $productsById = Product::whereIn('id', $productIds)->get()->keyBy('id');
        $reports = [];

        foreach ($metrics as $m) {
            $listings = match ($m) {
                'views' => Product::whereIn('id', $productIds)
                    ->select('id', 'title', 'image_url', 'view_count')
                    ->orderByDesc('view_count')
                    ->limit(5)
                    ->get()
                    ->map(fn ($p) => (object) ['id' => $p->id, 'title' => $p->title, 'image_url' => $p->image_url, 'count' => (int) ($p->view_count ?? 0)]),
                'comments' => Product::whereIn('id', $productIds)
                    ->withCount(['comments' => fn ($q) => $q->where('created_at', '>=', $since)])
                    ->orderByDesc('comments_count')
                    ->limit(5)
                    ->get()
                    ->map(fn ($p) => (object) ['id' => $p->id, 'title' => $p->title, 'image_url' => $p->image_url, 'count' => $p->comments_count]),
                'messages' => \App\Models\Conversation::whereIn('product_id', $productIds)
                    ->join('messages', 'messages.conversation_id', '=', 'conversations.id')
                    ->where('messages.created_at', '>=', $since)
                    ->selectRaw('conversations.product_id as id, count(messages.id) as count')
                    ->groupBy('conversations.product_id')
                    ->orderByDesc('count')
                    ->limit(5)
                    ->get()
                    ->map(fn ($r) => (object) [
                        'id' => $r->id,
                        'title' => $productsById->get($r->id)?->title ?? '',
                        'image_url' => $productsById->get($r->id)?->image_url,
                        'count' => (int) $r->count,
                    ]),
                'sales' => Purchase::whereIn('product_id', $productIds)
                    ->where('created_at', '>=', $since)
                    ->whereIn('status', [Purchase::STATUS_COMPLETED, Purchase::STATUS_DELIVERED])
                    ->selectRaw('product_id as id, count(*) as count')
                    ->groupBy('product_id')
                    ->orderByDesc('count')
                    ->limit(5)
                    ->get()
                    ->map(fn ($r) => (object) [
                        'id' => $r->id,
                        'title' => $productsById->get($r->id)?->title ?? '',
                        'image_url' => $productsById->get($r->id)?->image_url,
                        'count' => (int) $r->count,
                    ]),
                'bids' => Bid::whereIn('product_id', $productIds)
                    ->where('created_at', '>=', $since)
                    ->selectRaw('product_id as id, count(*) as count, max(amount) as top_bid_amount')
                    ->groupBy('product_id')
                    ->orderByDesc('count')
                    ->limit(5)
                    ->get()
                    ->map(fn ($r) => (object) [
                        'id' => $r->id,
                        'title' => $productsById->get($r->id)?->title ?? '',
                        'image_url' => $productsById->get($r->id)?->image_url,
                        'count' => (int) $r->count,
                        'top_bid_amount' => (float) ($r->top_bid_amount ?? 0),
                    ]),
                default => collect(),
            };

            $reports[] = ['metric' => $m, 'listings' => $listings];
        }

        return response()->json(['data' => $reports]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function walletBankTransferInstructions(): array
    {
        $method = PaymentMethod::query()
            ->where('code', PaymentMethod::CODE_BANK_TRANSFER)
            ->first();

        $locale = app()->getLocale() === 'en' ? 'en' : 'ar';
        $instructions = $method?->instructions[$locale] ?? $method?->instructions['ar'] ?? [];

        return [
            'account_name' => $instructions['account_name'] ?? '',
            'bank_name' => $instructions['bank_name'] ?? '',
            'iban' => $instructions['iban'] ?? '',
            'intro' => $instructions['intro'] ?? null,
            'steps' => $instructions['steps'] ?? [],
        ];
    }
}
