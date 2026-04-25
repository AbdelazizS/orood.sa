<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BidResource;
use App\Models\Bid;
use App\Models\Notification;
use App\Models\Purchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBidController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $status = strtoupper((string) $request->query('status', ''));
        $perPage = min(max((int) $request->query('per_page', 25), 1), 100);

        $rows = Bid::query()
            ->with(['product:id,title,user_id', 'user:id,name,username'])
            ->when($status !== '', fn ($qr) => $qr->where('status', $status))
            ->when($q !== '', function ($qr) use ($q) {
                $qr->where(function ($inner) use ($q) {
                    $inner->where('id', $q)
                        ->orWhere('product_id', $q)
                        ->orWhere('user_id', $q)
                        ->orWhereHas('product', fn ($p) => $p->where('title', 'like', "%{$q}%"))
                        ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%")->orWhere('username', 'like', "%{$q}%"));
                });
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        $items = collect($rows->items())->map(function (Bid $bid) {
            $payload = (new BidResource($bid))->toArray(request());
            $payload['product'] = $bid->product ? [
                'id' => $bid->product->id,
                'title' => $bid->product->title,
                'owner_id' => $bid->product->user_id,
            ] : null;
            $payload['buyer'] = $bid->user ? [
                'id' => $bid->user->id,
                'name' => $bid->user->name,
                'username' => $bid->user->username,
            ] : null;
            $purchase = Purchase::query()->where('bid_id', $bid->id)->first(['id', 'status']);
            $payload['order'] = $purchase ? [
                'id' => $purchase->id,
                'status' => $purchase->status,
            ] : null;

            return $payload;
        })->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function show(Bid $bid): JsonResponse
    {
        $bid->load(['product:id,title,user_id,status', 'user:id,name,username', 'acceptedBy:id,name,username']);
        $payload = (new BidResource($bid))->toArray(request());
        $payload['product'] = $bid->product;
        $payload['buyer'] = $bid->user;
        $payload['accepted_by_user'] = $bid->acceptedBy;
        $payload['order'] = Purchase::query()->where('bid_id', $bid->id)->first();
        $payload['audit'] = [
            'bid_created_at' => $bid->created_at,
            'accepted_at' => $bid->accepted_at,
            'rejected_at' => $bid->rejected_at,
            'withdrawn_at' => $bid->withdrawn_at,
            'notification_count' => Notification::query()
                ->whereRaw("JSON_EXTRACT(data, '$.bid_id') = ?", [(string) $bid->id])
                ->count(),
        ];

        return response()->json(['data' => $payload]);
    }

    public function hide(Bid $bid): JsonResponse
    {
        $bid->update(['is_visible' => false]);

        return response()->json(['message' => 'Bid hidden']);
    }

    public function destroy(Bid $bid): JsonResponse
    {
        $bid->delete();

        return response()->json(['message' => 'Bid deleted']);
    }
}
