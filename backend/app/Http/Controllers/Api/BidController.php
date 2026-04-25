<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BidResource;
use App\Events\CommentPosted;
use App\Models\Bid;
use App\Models\Comment;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Transaction;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BidController extends Controller
{
    private function normalizeSaudiPhone(?string $raw): string
    {
        $s = preg_replace('/[\s-]+/', '', (string) $raw);
        if ($s === null) {
            return '';
        }
        if (str_starts_with($s, '+966')) {
            $s = '0'.substr($s, 4);
        } elseif (str_starts_with($s, '966')) {
            $s = '0'.substr($s, 3);
        }

        return $s;
    }

    public function incoming(Request $request): JsonResponse
    {
        $user = $request->user();

        $status = strtoupper((string) $request->query('status', ''));
        $perPage = (int) $request->query('per_page', 20);

        $rows = Bid::query()
            ->whereHas('product', fn ($q) => $q->where('user_id', $user->id))
            ->with([
                'product:id,title,status,user_id,accept_bids,bids_visible',
                'user:id,name,username,avatar_url',
            ])
            ->when(in_array($status, [Bid::STATUS_PENDING, Bid::STATUS_ACCEPTED, Bid::STATUS_REJECTED, Bid::STATUS_WITHDRAWN], true), fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(perPage: $perPage > 0 ? $perPage : 20);

        $bidIds = collect($rows->items())->pluck('id')->all();
        $purchasesByBidId = Purchase::query()
            ->whereIn('bid_id', $bidIds)
            ->get(['id', 'bid_id', 'status'])
            ->keyBy('bid_id');

        $data = collect($rows->items())->map(function (Bid $bid) use ($purchasesByBidId) {
            $payload = (new BidResource($bid))->toArray(request());
            $payload['product'] = $bid->product ? [
                'id' => $bid->product->id,
                'title' => $bid->product->title,
                'status' => $bid->product->status,
                'accept_bids' => (bool) ($bid->product->accept_bids ?? false),
                'bids_visible' => (bool) ($bid->product->bids_visible ?? true),
            ] : null;
            $payload['buyer'] = $bid->user ? [
                'id' => $bid->user->id,
                'name' => $bid->user->name,
                'username' => $bid->user->username,
                'avatar_url' => $bid->user->avatar_url,
            ] : null;
            $purchase = $purchasesByBidId->get($bid->id);
            $payload['order'] = $purchase ? [
                'id' => $purchase->id,
                'status' => $purchase->status,
                'order_number' => 'ORD-'.str_pad((string) $purchase->id, 6, '0', STR_PAD_LEFT),
            ] : null;
            $payload['awaiting_buyer_order'] = $bid->status === Bid::STATUS_ACCEPTED && ! $purchase;
            $payload['can_accept'] = $bid->status === Bid::STATUS_PENDING;
            $payload['can_reject'] = $bid->status === Bid::STATUS_PENDING;

            return $payload;
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        $rows = Bid::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'product:id,title,status,user_id,accept_bids,bids_visible',
                'product.seller:id,name,username,avatar_url',
            ])
            ->orderByDesc('created_at')
            ->paginate(perPage: (int) $request->query('per_page', 20));

        $bidIds = collect($rows->items())->pluck('id')->all();
        $purchasesByBidId = Purchase::query()
            ->whereIn('bid_id', $bidIds)
            ->get(['id', 'bid_id', 'status'])
            ->keyBy('bid_id');

        $data = collect($rows->items())->map(function (Bid $bid) use ($purchasesByBidId) {
            $payload = (new BidResource($bid))->toArray(request());
            $payload['product'] = $bid->product ? [
                'id' => $bid->product->id,
                'title' => $bid->product->title,
                'status' => $bid->product->status,
                'accept_bids' => (bool) ($bid->product->accept_bids ?? false),
                'bids_visible' => (bool) ($bid->product->bids_visible ?? true),
                'seller' => $bid->product->seller ? [
                    'id' => $bid->product->seller->id,
                    'name' => $bid->product->seller->name,
                    'username' => $bid->product->seller->username,
                ] : null,
            ] : null;

            $payload['order'] = null;
            $payload['can_create_order'] = false;
            $payload['order_status'] = null;
            if ($bid->status === Bid::STATUS_ACCEPTED && $bid->product_id) {
                $purchase = $purchasesByBidId->get($bid->id);
                if ($purchase) {
                    $payload['order'] = [
                        'id' => $purchase->id,
                        'status' => $purchase->status,
                        'order_number' => 'ORD-'.str_pad((string) $purchase->id, 6, '0', STR_PAD_LEFT),
                    ];
                    $payload['order_status'] = $purchase->status;
                } else {
                    $payload['can_create_order'] = true;
                }
            }

            return $payload;
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function index(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if (! $product->isAccessibleBy($user)) {
            abort(404);
        }

        $isOwner = $user && $product->user_id === $user->id;
        $showBidDetails = $isOwner || (bool) $product->bids_visible;

        $bidsQuery = $product->bids()
            ->with('user:id,name,username,avatar_url,is_verified')
            ->where('status', Bid::STATUS_PENDING);

        if ($isOwner) {
            $bids = (clone $bidsQuery)->orderBy('amount', 'asc')->get();
        } elseif ($showBidDetails) {
            $bids = (clone $bidsQuery)->where('is_visible', true)->orderByDesc('created_at')->get();
        } else {
            $uid = $user?->id;
            $bids = $uid
                ? (clone $bidsQuery)->where('user_id', $uid)->orderByDesc('created_at')->get()
                : collect();
        }

        $items = $bids->map(fn ($b) => (new BidResource($b))->toArray(request()));

        $snapshot = $product->bidSnapshot($user);
        $pendingMaxAll = (float) ($product->bids()
            ->where('status', Bid::STATUS_PENDING)
            ->max('amount') ?? 0);
        $minimumNextBid = $pendingMaxAll > 0 ? round($pendingMaxAll + 0.01, 2) : null;

        return response()->json([
            'data' => $items,
            'highest_bid' => $snapshot['highest_bid'],
            'lowest_bid' => $snapshot['lowest_bid'],
            'bids_count' => $snapshot['bids_count'],
            'minimum_next_bid' => (! $showBidDetails && ! $isOwner) ? $minimumNextBid : null,
        ]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        if (! $product->accept_bids) {
            return response()->json(['message' => 'Bidding is not enabled for this listing'], 422);
        }

        if ($product->user_id === $request->user()->id) {
            return response()->json(['message' => 'لا يمكنك وضع عرض على إعلانك'], 422);
        }

        if ($product->status !== 'published') {
            return response()->json(['message' => 'لا يمكن وضع عرض على إعلان غير منشور'], 422);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'message' => ['nullable', 'string', 'max:500'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $amount = (float) $validated['amount'];
        $note = $validated['note'] ?? $validated['message'] ?? null;
        $bidComment = null;

        $bid = DB::transaction(function () use ($product, $request, $amount, $note, &$bidComment) {
            $pendingMax = (float) ($product->bids()
                ->where('status', Bid::STATUS_PENDING)
                ->lockForUpdate()
                ->max('amount') ?? 0);

            if ($pendingMax > 0 && $amount <= $pendingMax) {
                throw ValidationException::withMessages([
                    'amount' => 'يجب أن يكون العرض أعلى من أعلى عرض حالي',
                ]);
            }

            $bid = Bid::updateOrCreate(
                [
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                ],
                [
                    'amount' => $amount,
                    'message' => $note,
                    'note' => $note,
                    'is_visible' => true,
                    'status' => Bid::STATUS_PENDING,
                    'accepted_at' => null,
                    'rejected_at' => null,
                    'withdrawn_at' => null,
                ]
            );

            $bidComment = Comment::create([
                'listing_id' => $product->id,
                'user_id' => $request->user()->id,
                'parent_id' => null,
                'type' => 'BID',
                'body' => 'وضع عرض',
                'bid_amount' => $amount,
                'is_visible' => true,
            ]);

            $product->refreshBidStats();

            return $bid;
        });

        if ($bidComment !== null) {
            event(new CommentPosted($bidComment));
        }

        Notification::create(
            InAppNotificationPayload::bidNew($product, (int) $bid->id, $amount, (int) $request->user()->id)
        );

        return response()->json([
            'data' => new BidResource($bid->load('user')),
            'message' => 'تم وضع العرض بنجاح',
        ], 201);
    }

    public function createOrder(Request $request, Bid $bid): JsonResponse
    {
        $user = $request->user();
        if ((int) $bid->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($bid->status !== Bid::STATUS_ACCEPTED) {
            return response()->json(['message' => 'Only accepted bids can create orders'], 422);
        }

        $product = Product::query()->find($bid->product_id);
        if (! $product) {
            return response()->json(['message' => 'Listing not found'], 404);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'in:escrow,cod'],
            'shipping_address' => ['nullable', 'string', 'max:500'],
            'buyer_note' => ['nullable', 'string', 'max:2000'],
            'buyer_phone' => ['nullable', 'string', 'max:20'],
            'buyer_email' => ['nullable', 'email'],
            'buyer_name' => ['nullable', 'string', 'max:255'],
            'shipping_lat' => ['required', 'numeric', 'between:-90,90'],
            'shipping_lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        if (($validated['payment_method'] ?? null) === 'cod') {
            $shippingAddress = trim((string) ($validated['shipping_address'] ?? ''));
            if (mb_strlen($shippingAddress) < 5) {
                throw ValidationException::withMessages([
                    'shipping_address' => __('For cash on delivery, enter a full shipping address (at least 5 characters).'),
                ]);
            }
        }

        $incomingPhone = trim((string) ($validated['buyer_phone'] ?? ''));
        if ($incomingPhone !== '') {
            $normalized = $this->normalizeSaudiPhone($incomingPhone);
            if (! preg_match('/^05\d{8}$/', $normalized)) {
                throw ValidationException::withMessages([
                    'buyer_phone' => __('Use a Saudi mobile number, e.g. 05xxxxxxxx.'),
                ]);
            }
            $validated['buyer_phone'] = $normalized;
        }

        $paymentMethod = $validated['payment_method'];
        $amount = (float) $bid->amount;
        if ($amount <= 0) {
            return response()->json(['message' => 'Invalid bid amount'], 422);
        }

        try {
            $purchase = DB::transaction(function () use ($bid, $product, $user, $validated, $paymentMethod, $amount) {
                $existing = Purchase::query()->where('bid_id', $bid->id)->first();
                if ($existing) {
                    return $existing;
                }

                $status = $paymentMethod === 'escrow'
                    ? Purchase::STATUS_AWAITING_PAYMENT
                    : Purchase::STATUS_COD_REQUESTED;

                $purchase = Purchase::create([
                    'product_id' => $product->id,
                    'buyer_id' => $user->id,
                    'seller_id' => $product->user_id,
                    'bid_id' => $bid->id,
                    'amount' => $amount,
                    'quantity' => 1,
                    'payment_method' => $paymentMethod,
                    'status' => $status,
                    'shipping_address' => $validated['shipping_address'] ?? null,
                    'shipping_lat' => $validated['shipping_lat'] ?? null,
                    'shipping_lng' => $validated['shipping_lng'] ?? null,
                    'buyer_note' => $validated['buyer_note'] ?? null,
                    'buyer_phone' => $validated['buyer_phone'] ?? $user->phone,
                    'buyer_email' => $validated['buyer_email'] ?? $user->email,
                    'buyer_name' => $validated['buyer_name'] ?? $user->name,
                ]);

                if ($paymentMethod === 'escrow') {
                    $buyerBalance = \App\Models\Balance::getOrCreateForUser($user->id);
                    if ((float) $buyerBalance->available < $amount) {
                        throw new \RuntimeException('INSUFFICIENT_BALANCE');
                    }
                    $buyerBalance->decrement('available', $amount);
                    $buyerBalance->increment('escrow', $amount);
                    Transaction::create([
                        'user_id' => $user->id,
                        'type' => Transaction::TYPE_ORDER_PAYMENT,
                        'amount' => -$amount,
                        'description' => __('Escrow hold for purchase').' #'.$purchase->id,
                        'purchase_id' => $purchase->id,
                        'status' => Transaction::STATUS_COMPLETED,
                        'completed_at' => now(),
                    ]);
                }

                Notification::create(
                    InAppNotificationPayload::bidOrderCreatedForSeller($product, (int) $bid->id, (int) $product->user_id, $purchase)
                );

                return $purchase;
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_BALANCE') {
                return response()->json(['message' => 'Insufficient available balance. Please charge your wallet first.'], 422);
            }
            throw $e;
        }

        return response()->json([
            'message' => 'Order created from accepted bid.',
            'data' => $purchase->load(['product', 'buyer', 'seller']),
        ], 201);
    }

    public function reject(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! $bid->isPending()) {
            return response()->json(['message' => 'Bid already processed'], 422);
        }

        $bid->update([
            'status' => Bid::STATUS_REJECTED,
            'rejected_at' => now(),
        ]);

        $product->refreshBidStats();
        Notification::create(
            InAppNotificationPayload::bidRejectedForBuyer($product, (int) $bid->id, (int) $bid->user_id)
        );

        return response()->json(['message' => 'تم رفض العرض']);
    }

    public function destroy(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($bid->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! $bid->isPending()) {
            return response()->json(['message' => 'Cannot withdraw processed bid'], 422);
        }

        $bid->update([
            'status' => Bid::STATUS_WITHDRAWN,
            'withdrawn_at' => now(),
        ]);

        $product->refreshBidStats();

        return response()->json(['message' => 'تم سحب العرض']);
    }

    public function toggleVisibility(Request $request, Product $product, Bid $bid): JsonResponse
    {
        if ($bid->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($bid->product_id !== $product->id) {
            return response()->json(['message' => 'Bid not found for this product'], 404);
        }

        if (! $bid->isPending()) {
            return response()->json(['message' => 'Cannot change visibility of processed bid'], 422);
        }

        $bid->update(['is_visible' => ! $bid->is_visible]);
        $product->refreshBidStats();

        return response()->json([
            'data' => new BidResource($bid->fresh()->load('user')),
            'message' => $bid->is_visible ? 'الآن العرض مرئي' : 'الآن العرض مخفي',
        ]);
    }
}
