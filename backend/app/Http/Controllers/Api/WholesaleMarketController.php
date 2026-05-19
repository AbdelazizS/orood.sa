<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WholesaleMarketIndexRequest;
use App\Http\Resources\ProductResource;
use App\Models\GroupBuyReservation;
use App\Models\Notification;
use App\Models\Product;
use App\Services\WholesaleReservationLifecycleService;
use App\Support\InAppNotificationPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WholesaleMarketController extends Controller
{
    public function __construct(private readonly WholesaleReservationLifecycleService $lifecycle) {}

    public function categoryCounts(): JsonResponse
    {
        $counts = Product::query()
            ->publiclyListed()
            ->where('is_wholesale', true)
            ->whereNotNull('wholesale_price')
            ->whereNotNull('category_id')
            ->selectRaw('category_id, COUNT(*) as c')
            ->groupBy('category_id')
            ->pluck('c', 'category_id')
            ->map(fn ($c) => (int) $c)
            ->all();

        return response()->json(['data' => $counts]);
    }

    public function index(WholesaleMarketIndexRequest $request): JsonResponse
    {
        $query = Product::query()
            ->publiclyListed()
            ->where('is_wholesale', true)
            ->whereNotNull('wholesale_price')
            ->with(['seller.company', 'category', 'subcategory', 'region', 'city'])
            ->withCount([
                'activeWholesaleReservations as wholesale_reserved_count' => fn ($q) => $q->select(DB::raw('coalesce(sum(quantity),0)')),
            ]);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('subcategory_id')) {
            $query->where('subcategory_id', $request->integer('subcategory_id'));
        }
        if ($request->filled('city_id')) {
            $query->where('city_id', $request->integer('city_id'));
        }
        if ($request->filled('region_id')) {
            $query->where('region_id', $request->integer('region_id'));
        }
        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }
        if ($request->filled('price_min')) {
            $query->where('wholesale_price', '>=', (float) $request->query('price_min'));
        }
        if ($request->filled('price_max')) {
            $query->where('wholesale_price', '<=', (float) $request->query('price_max'));
        }
        if ($request->filled('condition')) {
            $query->where('condition', (string) $request->query('condition'));
        }
        if ($request->filled('min_discount')) {
            $min = (int) $request->query('min_discount');
            $query->where(function ($q) use ($min) {
                $q->where('discount_percent', '>=', $min)
                    ->orWhereRaw(
                        '(COALESCE(discount_percent, 0) = 0 AND price > 0 AND wholesale_price > 0 AND wholesale_price <= price AND ROUND(((price - wholesale_price) / price) * 100) >= ?)',
                        [$min]
                    );
            });
        }
        if ($request->filled('min_buyers')) {
            $query->where('min_quantity', '>=', $request->integer('min_buyers'));
        }

        $reservedSql = '(SELECT COALESCE(SUM(quantity),0) FROM group_buy_reservations gbr WHERE gbr.product_id = products.id AND gbr.status IN (?, ?))';
        $pending = GroupBuyReservation::STATUS_PENDING;
        $paymentPending = GroupBuyReservation::STATUS_PAYMENT_PENDING;

        // Portable replacement for GREATEST(1, COALESCE(min_quantity, 1)) — SQLite has no GREATEST().
        $minBuyersTargetSql = '(CASE WHEN COALESCE(products.min_quantity, 1) < 1 THEN 1 ELSE COALESCE(products.min_quantity, 1) END)';
        // "Almost full": remaining slots <= ceil(target * 0.2). MySQL uses CEILING; SQLite has neither CEIL nor GREATEST.
        $driver = DB::connection()->getDriverName();
        $almostFullThresholdSql = in_array($driver, ['mysql', 'mariadb'], true)
            ? "GREATEST(1, CEILING(({$minBuyersTargetSql}) * 0.2))"
            : "(({$minBuyersTargetSql}) * 2 + 9) / 10";

        if ($request->query('group_status') === 'open') {
            $query->whereRaw("{$reservedSql} < {$minBuyersTargetSql}", [$pending, $paymentPending]);
        } elseif ($request->query('group_status') === 'almost_full') {
            $query->whereRaw(
                "{$reservedSql} < {$minBuyersTargetSql} AND (({$minBuyersTargetSql}) - ({$reservedSql})) <= {$almostFullThresholdSql}",
                [$pending, $paymentPending, $pending, $paymentPending]
            );
        }

        $sort = (string) $request->query('sort', 'newest');
        match ($sort) {
            'price_asc' => $query->orderBy('wholesale_price'),
            'price_desc' => $query->orderByDesc('wholesale_price'),
            'discount' => $query->orderByDesc('discount_percent'),
            'popular' => $query->orderByDesc('wholesale_reserved_count'),
            default => $query->orderByDesc('published_at'),
        };

        $products = $query->paginate((int) $request->query('per_page', 20));
        $userId = $request->user()?->id;

        $data = collect(ProductResource::collection($products->getCollection())->resolve())
            ->map(function (array $item) use ($userId) {
                $target = max(1, (int) ($item['min_quantity'] ?? 0));
                $reserved = (int) GroupBuyReservation::query()
                    ->where('product_id', $item['id'])
                    ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING])
                    ->sum('quantity');

                $discountPercent = (int) ($item['discount_percent'] ?? 0);
                if ($discountPercent <= 0) {
                    $price = (float) ($item['price'] ?? 0);
                    $wholesalePrice = (float) ($item['wholesale_price'] ?? 0);
                    if ($price > 0 && $wholesalePrice > 0 && $wholesalePrice <= $price) {
                        $discountPercent = (int) round((($price - $wholesalePrice) / $price) * 100);
                    }
                }

                $mine = null;
                if ($userId) {
                    $mine = GroupBuyReservation::query()
                        ->where('product_id', $item['id'])
                        ->where('user_id', $userId)
                        ->first();
                }

                $item['current_buyers'] = $reserved;
                $item['reserved_seats'] = $reserved;
                $item['remaining_needed'] = max(0, $target - $reserved);
                $item['progress_percentage'] = (int) min(100, round(($reserved / $target) * 100));
                $item['discount_percent'] = $discountPercent;
                $item['campaign_completed'] = $reserved >= $target;
                $item['user_reserved'] = in_array((string) ($mine?->status ?? ''), [
                    GroupBuyReservation::STATUS_PENDING,
                    GroupBuyReservation::STATUS_PAYMENT_PENDING,
                ], true);
                $item['my_reservation'] = $mine ? [
                    'id' => $mine->id,
                    'quantity' => (int) $mine->quantity,
                    'status' => $mine->status,
                    'checkout_expires_at' => optional($mine->checkout_expires_at)->toIso8601String(),
                    'purchase_id' => $mine->purchase_id,
                ] : null;

                return $item;
            })
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        if (! $product->is_wholesale || ! $product->isAccessibleBy($request->user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $this->lifecycle->expireOverdueReservations($product);
        $target = max(1, (int) ($product->min_quantity ?? 0));
        $activeReservationStatuses = [
            GroupBuyReservation::STATUS_PENDING,
            GroupBuyReservation::STATUS_PAYMENT_PENDING,
        ];
        $reserved = (int) GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->whereIn('status', $activeReservationStatuses)
            ->sum('quantity');
        $activeBuyerCount = (int) GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->whereIn('status', $activeReservationStatuses)
            ->selectRaw('count(distinct user_id) as c')
            ->value('c');
        $myReservation = $request->user()
            ? GroupBuyReservation::query()
                ->where('product_id', $product->id)
                ->where('user_id', $request->user()->id)
                ->first()
            : null;

        $resource = (new ProductResource($product->load(['seller.company', 'category', 'subcategory', 'region', 'city'])))->resolve();
        $resource['current_buyers'] = $reserved;
        $resource['reserved_seats'] = $reserved;
        $resource['active_buyer_count'] = $activeBuyerCount;
        $resource['remaining_needed'] = max(0, $target - $reserved);
        $resource['progress_percentage'] = (int) min(100, round(($reserved / $target) * 100));
        $resource['campaign_completed'] = $reserved >= $target;
        $resource['user_reserved'] = in_array((string) ($myReservation?->status ?? ''), [
            GroupBuyReservation::STATUS_PENDING,
            GroupBuyReservation::STATUS_PAYMENT_PENDING,
        ], true);
        $resource['my_reservation'] = $myReservation ? [
            'id' => $myReservation->id,
            'quantity' => (int) $myReservation->quantity,
            'status' => $myReservation->status,
            'checkout_expires_at' => optional($myReservation->checkout_expires_at)->toIso8601String(),
            'purchase_id' => $myReservation->purchase_id,
        ] : null;
        $resource['participants'] = GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING, GroupBuyReservation::STATUS_PURCHASED])
            ->latest('id')
            ->limit(20)
            ->with('user:id,name,image,avatar')
            ->get()
            ->map(fn (GroupBuyReservation $row) => [
                'id' => $row->id,
                'quantity' => (int) $row->quantity,
                'status' => $row->status,
                'joined_at' => $row->created_at?->toIso8601String(),
                'user' => [
                    'id' => $row->user?->id,
                    'name' => $row->user?->name,
                    'avatar' => $row->user?->avatar ?: $row->user?->image,
                ],
            ])
            ->values();

        return response()->json(['data' => $resource]);
    }

    public function reserve(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if (! $product->is_wholesale || $product->status !== 'published') {
            return response()->json(['message' => __('wholesale.product_not_available')], 422);
        }
        if ((int) $product->user_id === (int) $user->id) {
            return response()->json(['message' => __('wholesale.owner_cannot_reserve')], 422);
        }

        if (! config('wholesale.admin_reserve_enabled', true) && $user->isAdminRole()) {
            return response()->json(['message' => __('wholesale.admin_cannot_reserve')], 422);
        }

        $validated = $request->validate(['quantity' => ['nullable', 'integer', 'min:1', 'max:10000']]);
        $quantity = (int) ($validated['quantity'] ?? 1);

        $activeReservation = GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING])
            ->first();
        if ($activeReservation) {
            return response()->json([
                'message' => __('wholesale.reservation_already_exists'),
                'code' => 'already_reserved',
                'data' => [
                    'reservation_id' => $activeReservation->id,
                    'status' => $activeReservation->status,
                ],
            ]);
        }

        $createdReservationId = null;
        $reserveError = null;

        DB::transaction(function () use ($product, $user, $quantity, &$createdReservationId, &$reserveError) {
            Product::query()->whereKey($product->id)->lockForUpdate()->first();
            $product->refresh();

            $target = max(1, (int) ($product->min_quantity ?? 0));
            $reserved = (int) GroupBuyReservation::query()
                ->where('product_id', $product->id)
                ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING])
                ->sum('quantity');
            $remaining = max(0, $target - $reserved);

            if ($remaining < 1) {
                $reserveError = [
                    'message' => __('wholesale.group_full'),
                    'code' => 'group_full',
                ];

                return;
            }

            if ($quantity > $remaining) {
                $reserveError = [
                    'message' => __('wholesale.reservation_quantity_exceeds_remaining', ['remaining' => $remaining]),
                    'code' => 'quantity_exceeds_remaining',
                    'data' => ['remaining' => $remaining],
                ];

                return;
            }

            $reservation = GroupBuyReservation::query()->updateOrCreate(
                ['product_id' => $product->id, 'user_id' => $user->id],
                [
                    'quantity' => $quantity,
                    'status' => GroupBuyReservation::STATUS_PENDING,
                    'checkout_expires_at' => null,
                    'cancelled_at' => null,
                ]
            );
            $createdReservationId = $reservation->id;
            $this->lifecycle->syncProductProgress($product);
            Notification::create(
                InAppNotificationPayload::wholesaleReservationCreated(
                    userId: (int) $user->id,
                    product: $product,
                    reservationId: (int) $reservation->id,
                    quantity: (int) $quantity,
                )
            );
            $sellerId = (int) $product->user_id;
            if ($sellerId > 0) {
                Notification::create(
                    InAppNotificationPayload::wholesaleNewParticipantSeller(
                        $sellerId,
                        $product,
                        trim((string) ($user->name ?? '')) !== '' ? (string) $user->name : 'Buyer',
                        (int) $quantity
                    )
                );
            }
        });

        if ($reserveError !== null) {
            return response()->json([
                'message' => $reserveError['message'],
                'code' => $reserveError['code'],
                'data' => $reserveError['data'] ?? null,
            ], 422);
        }

        return response()->json([
            'message' => __('wholesale.reservation_created'),
            'code' => 'reserved',
            'data' => [
                'reservation_id' => $createdReservationId,
            ],
        ], 201);
    }

    public function cancelReservation(Request $request, Product $product): JsonResponse
    {
        $reservation = GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->where('user_id', $request->user()->id)
            ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING])
            ->first();

        if (! $reservation) {
            return response()->json(['message' => __('wholesale.reservation_not_found')], 404);
        }

        DB::transaction(function () use ($reservation, $product) {
            $reservation->update([
                'status' => GroupBuyReservation::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);
            $this->lifecycle->syncProductProgress($product);
        });

        return response()->json(['message' => __('wholesale.reservation_cancelled')]);
    }

    public function myReservations(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $rows = GroupBuyReservation::query()
            ->where('user_id', $userId)
            ->with(['product.seller', 'purchase'])
            ->latest('id')
            ->get();

        $map = fn (GroupBuyReservation $row) => [
            'id' => $row->id,
            'status' => $row->status,
            'quantity' => (int) $row->quantity,
            'checkout_expires_at' => optional($row->checkout_expires_at)->toIso8601String(),
            'purchased_at' => optional($row->purchased_at)->toIso8601String(),
            'purchase_id' => $row->purchase_id,
            'order' => $row->purchase ? [
                'id' => $row->purchase->id,
                'status' => $row->purchase->status,
                'payment_method' => $row->purchase->payment_method,
                'amount' => (float) $row->purchase->amount,
            ] : null,
            'can_cancel' => in_array($row->status, [
                GroupBuyReservation::STATUS_PENDING,
                GroupBuyReservation::STATUS_PAYMENT_PENDING,
            ], true),
            'can_checkout' => $row->status === GroupBuyReservation::STATUS_PAYMENT_PENDING
                && $row->purchase_id === null
                && ($row->checkout_expires_at === null || $row->checkout_expires_at->isFuture()),
            'price_snapshot' => $row->price_snapshot !== null ? (float) $row->price_snapshot : null,
            'product' => $row->product ? [
                'id' => $row->product->id,
                'title' => $row->product->title,
                'image_url' => $row->product->image_url,
                'wholesale_price' => $row->product->wholesale_price,
                'min_quantity' => $row->product->min_quantity,
                'allow_cod' => (bool) ($row->product->allow_cod ?? true),
                'seller' => [
                    'id' => $row->product->seller?->id,
                    'name' => $row->product->seller?->name,
                ],
            ] : null,
        ];

        return response()->json([
            'data' => [
                'waiting' => $rows->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING])->values()->map($map)->values(),
                'completed' => $rows->where('status', GroupBuyReservation::STATUS_PURCHASED)->values()->map($map)->values(),
                'closed' => $rows->whereIn('status', [GroupBuyReservation::STATUS_CANCELLED, GroupBuyReservation::STATUS_EXPIRED])->values()->map($map)->values(),
            ],
        ]);
    }
}
