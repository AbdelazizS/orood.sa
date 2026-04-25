<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GroupBuyReservation;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupBuyReservationController extends Controller
{
    public function progress(Product $listing): JsonResponse
    {
        if (!$listing->is_wholesale || !$listing->min_quantity) {
            return response()->json([
                'data' => [
                    'enabled' => false,
                    'target' => null,
                    'reserved' => 0,
                    'remaining' => null,
                    'filled' => false,
                    'awaiting_payment' => false,
                    'mine' => null,
                ],
            ]);
        }

        $target = (int) $listing->min_quantity;

        $hasPaymentPending = GroupBuyReservation::query()
            ->where('product_id', $listing->id)
            ->where('status', 'payment_pending')
            ->exists();

        $mine = null;
        if (request()->user()) {
            $row = GroupBuyReservation::query()
                ->where('product_id', $listing->id)
                ->where('user_id', request()->user()->id)
                ->first();
            if ($row) {
                $mine = [
                    'quantity' => (int) $row->quantity,
                    'status' => $row->status,
                ];
            }
        }

        if ($hasPaymentPending) {
            return response()->json([
                'data' => [
                    'enabled' => true,
                    'target' => $target,
                    'reserved' => $target,
                    'remaining' => 0,
                    'filled' => true,
                    'awaiting_payment' => true,
                    'mine' => $mine,
                ],
            ]);
        }

        $reserved = (int) GroupBuyReservation::query()
            ->where('product_id', $listing->id)
            ->where('status', 'pending')
            ->sum('quantity');

        $filled = $reserved >= $target;

        return response()->json([
            'data' => [
                'enabled' => true,
                'target' => $target,
                'reserved' => $reserved,
                'remaining' => max(0, $target - $reserved),
                'filled' => $filled,
                'awaiting_payment' => false,
                'mine' => $mine,
            ],
        ]);
    }

    public function store(Request $request, Product $listing): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => __('Unauthenticated.')], 401);
        }

        if (!$listing->is_wholesale || !$listing->min_quantity) {
            return response()->json(['message' => __('Group buy is not available for this listing.')], 422);
        }

        if (GroupBuyReservation::query()->where('product_id', $listing->id)->where('status', 'payment_pending')->exists()) {
            return response()->json(['message' => __('Group buy is closed for new reservations.')], 422);
        }

        if ($listing->user_id === $user->id) {
            return response()->json(['message' => __('You cannot reserve your own listing.')], 422);
        }

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:10000'],
        ]);
        $qty = (int) $validated['quantity'];
        $target = (int) $listing->min_quantity;

        return DB::transaction(function () use ($listing, $user, $qty, $target) {
            $existing = GroupBuyReservation::query()
                ->where('product_id', $listing->id)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            $sumOthers = (int) GroupBuyReservation::query()
                ->where('product_id', $listing->id)
                ->where('status', 'pending')
                ->where('user_id', '!=', $user->id)
                ->sum('quantity');

            $maxAllowed = max(0, $target - $sumOthers);
            if ($qty > $maxAllowed) {
                return response()->json([
                    'message' => __('Quantity exceeds remaining slots.'),
                    'errors' => ['quantity' => [__('Maximum :n units.', ['n' => $maxAllowed])]],
                ], 422);
            }

            if ($existing) {
                if ($existing->status !== 'pending') {
                    return response()->json(['message' => __('Reservation cannot be changed.')], 422);
                }
                $existing->update(['quantity' => $qty]);
            } else {
                GroupBuyReservation::create([
                    'product_id' => $listing->id,
                    'user_id' => $user->id,
                    'quantity' => $qty,
                    'status' => 'pending',
                ]);
            }

            $reserved = (int) GroupBuyReservation::query()
                ->where('product_id', $listing->id)
                ->where('status', 'pending')
                ->sum('quantity');

            if ($reserved >= $target) {
                GroupBuyReservation::query()
                    ->where('product_id', $listing->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'payment_pending']);
            }

            return response()->json(['message' => __('Reservation saved.')]);
        });
    }
}
