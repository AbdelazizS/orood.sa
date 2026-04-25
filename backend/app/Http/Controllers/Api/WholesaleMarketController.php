<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
    public function __construct(private readonly WholesaleReservationLifecycleService $lifecycle)
    {
    }

    public function index(Request $request): JsonResponse
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
        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
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
        $reserved = (int) GroupBuyReservation::query()
            ->where('product_id', $product->id)
            ->whereIn('status', [GroupBuyReservation::STATUS_PENDING, GroupBuyReservation::STATUS_PAYMENT_PENDING])
            ->sum('quantity');
        $myReservation = $request->user()
            ? GroupBuyReservation::query()
                ->where('product_id', $product->id)
                ->where('user_id', $request->user()->id)
                ->first()
            : null;

        $resource = (new ProductResource($product->load(['seller.company', 'category', 'subcategory', 'region', 'city'])))->resolve();
        $resource['current_buyers'] = $reserved;
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
        DB::transaction(function () use ($product, $user, $quantity, &$createdReservationId) {
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
        });

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
            'can_checkout' => $row->status === GroupBuyReservation::STATUS_PAYMENT_PENDING
                && $row->purchase_id === null
                && ($row->checkout_expires_at === null || $row->checkout_expires_at->isFuture()),
            'product' => $row->product ? [
                'id' => $row->product->id,
                'title' => $row->product->title,
                'image_url' => $row->product->image_url,
                'wholesale_price' => $row->product->wholesale_price,
                'min_quantity' => $row->product->min_quantity,
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
