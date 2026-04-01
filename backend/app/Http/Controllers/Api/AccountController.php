<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\DocumentVerification;
use App\Models\Guarantee;
use App\Models\PageVisit;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Transaction;
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
     * Deposit financial guarantee.
     */
    public function depositGuarantee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:100'],
        ]);

        $user = $request->user();
        $amount = (float) $validated['amount'];
        $balance = Balance::getOrCreateForUser($user->id);
        if ((float) $balance->available < $amount) {
            return response()->json(['message' => __('Insufficient balance.')], 422);
        }

        DB::transaction(function () use ($user, $balance, $amount) {
            Guarantee::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'status' => Guarantee::STATUS_ACTIVE,
            ]);
            $user->increment('financial_guarantee', $amount);
            $balance->decrement('available', $amount);
            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_DEPOSIT,
                'amount' => -$amount,
                'description' => __('Deposit to financial guarantee'),
            ]);
        });

        return response()->json([
            'message' => __('Guarantee deposited successfully.'),
            'data' => [
                'financial_guarantee' => (float) $user->fresh()->financial_guarantee,
            ],
        ], 201);
    }

    /**
     * Refund financial guarantee to balance.
     */
    public function refundGuarantee(Request $request): JsonResponse
    {
        $user = $request->user();
        $amount = (float) ($user->financial_guarantee ?? 0);

        if ($amount <= 0) {
            return response()->json(['message' => __('No guarantee to refund.')], 422);
        }

        // Check for pending orders where seller might need guarantee
        $pendingAsSeller = Purchase::where('seller_id', $user->id)
            ->whereIn('status', ['pending', 'paid', 'shipped', 'delivered'])
            ->exists();

        if ($pendingAsSeller) {
            return response()->json([
                'message' => __('Cannot refund guarantee while you have pending orders.'),
            ], 422);
        }

        DB::transaction(function () use ($user, $amount) {
            Guarantee::where('user_id', $user->id)
                ->where('status', Guarantee::STATUS_ACTIVE)
                ->update(['status' => Guarantee::STATUS_REFUNDED, 'refunded_at' => now()]);

            $user->update(['financial_guarantee' => 0]);

            $balance = Balance::getOrCreateForUser($user->id);
            $balance->increment('available', $amount);

            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_GUARANTEE_WITHDRAWAL,
                'amount' => $amount,
                'description' => __('Guarantee refunded to balance'),
            ]);
        });

        return response()->json([
            'message' => __('Guarantee refunded to your balance.'),
            'data' => [
                'financial_guarantee' => 0,
                'balance' => (float) Balance::getOrCreateForUser($user->id)->available,
            ],
        ]);
    }

    /**
     * Get guarantee status.
     */
    public function guaranteeStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $amount = (float) ($user->financial_guarantee ?? 0);
        $pendingAsSeller = Purchase::where('seller_id', $user->id)
            ->whereIn('status', ['pending', 'paid', 'shipped', 'delivered'])
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

        return response()->json([
            'data' => [
                'available' => (float) $balance->available,
                'escrow' => (float) $balance->escrow,
                'withdrawable' => (float) ($balance->withdrawable ?? 0),
                'financial_guarantee' => $guarantee,
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
        ]);

        $user = $request->user();
        $balance = Balance::getOrCreateForUser($user->id);
        $amount = (float) $validated['amount'];

        DB::transaction(function () use ($user, $balance, $amount) {
            $balance->increment('available', $amount);
            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_DEPOSIT,
                'amount' => $amount,
                'description' => __('Balance charge'),
            ]);
        });

        $balance->refresh();

        return response()->json([
            'message' => __('Balance charged successfully.'),
            'data' => [
                'balance' => (float) $balance->available,
                'transaction' => $user->transactions()->latest()->first(),
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
            Purchase::where('seller_id', $user->id)->where('status', Purchase::STATUS_PENDING)->count(),
            Purchase::where('seller_id', $user->id)->whereIn('status', [Purchase::STATUS_PAID, Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED])->count(),
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
        })->whereIn('status', [Purchase::STATUS_PENDING, Purchase::STATUS_PAID, Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED])
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

        $profileVisits = PageVisit::where('profile_id', $user->id);
        $productIds = Product::where('user_id', $user->id)->pluck('id');
        $listingVisits = PageVisit::whereIn('product_id', $productIds);

        $now = $profileVisits->clone()->where('created_at', '>=', now()->subMinutes(5))->count();
        $today = $profileVisits->clone()->whereDate('created_at', today())->count();
        $week = $profileVisits->clone()->where('created_at', '>=', now()->subWeek())->count();
        $month = $profileVisits->clone()->where('created_at', '>=', now()->subMonth())->count();
        $year = $profileVisits->clone()->where('created_at', '>=', now()->subYear())->count();

        $sources = ['whatsapp', 'twitter', 'facebook', 'linkedin', 'youtube', 'direct', 'other'];
        $todaySources = $profileVisits->clone()->whereDate('created_at', today())
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();
        $weekSources = $profileVisits->clone()->where('created_at', '>=', now()->subWeek())
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();
        $monthSources = $profileVisits->clone()->where('created_at', '>=', now()->subMonth())
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();
        $yearSources = $profileVisits->clone()->where('created_at', '>=', now()->subYear())
            ->selectRaw('coalesce(nullif(source, ""), "other") as src, count(*) as cnt')
            ->groupBy('src')
            ->pluck('cnt', 'src')
            ->toArray();

        $recentVisitors = PageVisit::where('profile_id', $user->id)
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
                'counts' => ['now' => $now, 'today' => $today, 'week' => $week, 'month' => $month, 'year' => $year],
                'sources' => [
                    'today' => array_merge(array_fill_keys($sources, 0), $todaySources),
                    'week' => array_merge(array_fill_keys($sources, 0), $weekSources),
                    'month' => array_merge(array_fill_keys($sources, 0), $monthSources),
                    'year' => array_merge(array_fill_keys($sources, 0), $yearSources),
                ],
                'recent_visitors' => $recentVisitors,
                'share_link' => $shareLink,
                'total_visits' => $profileVisits->clone()->count(),
                'listing_visits' => $listingVisits->count(),
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

        if (!in_array($purchase->status, [Purchase::STATUS_PAID, Purchase::STATUS_SHIPPED, Purchase::STATUS_DELIVERED])) {
            return response()->json(['message' => __('Order cannot be confirmed in current status.')], 422);
        }

        $amount = (float) $purchase->amount;

        DB::transaction(function () use ($purchase, $amount) {
            $purchase->update(['status' => Purchase::STATUS_COMPLETED]);

            $sellerBalance = Balance::getOrCreateForUser($purchase->seller_id);
            $sellerBalance->decrement('escrow', $amount);
            $sellerBalance->increment('available', $amount);
        });

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

        if ($withdrawable < $amount) {
            return response()->json([
                'message' => __('Insufficient withdrawable balance.'),
            ], 422);
        }

        DB::transaction(function () use ($user, $balance, $amount) {
            $balance->decrement('withdrawable', $amount);
            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_WITHDRAWAL,
                'amount' => -$amount,
                'description' => __('Withdrawal request'),
            ]);
        });

        return response()->json([
            'message' => __('Withdrawal request submitted.'),
            'data' => ['success' => true],
        ], 201);
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
                        'title' => Product::find($r->id)?->title ?? '',
                        'image_url' => Product::find($r->id)?->image_url,
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
                        'title' => Product::find($r->id)?->title ?? '',
                        'image_url' => Product::find($r->id)?->image_url,
                        'count' => (int) $r->count,
                    ]),
                'bids' => \App\Models\Bid::whereIn('product_id', $productIds)
                    ->where('created_at', '>=', $since)
                    ->selectRaw('product_id as id, count(*) as count')
                    ->groupBy('product_id')
                    ->orderByDesc('count')
                    ->limit(5)
                    ->get()
                    ->map(fn ($r) => (object) [
                        'id' => $r->id,
                        'title' => Product::find($r->id)?->title ?? '',
                        'image_url' => Product::find($r->id)?->image_url,
                        'count' => (int) $r->count,
                    ]),
                default => collect(),
            };

            $reports[] = ['metric' => $m, 'listings' => $listings];
        }

        return response()->json(['data' => $reports]);
    }
}
