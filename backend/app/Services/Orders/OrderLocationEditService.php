<?php

namespace App\Services\Orders;

use App\Models\OrderEditLog;
use App\Models\OrderEditPolicy;
use App\Models\Purchase;
use App\Models\User;
use InvalidArgumentException;

class OrderLocationEditService
{
    public function evaluate(Purchase $order, int $userId): array
    {
        $policy = OrderEditPolicy::globalPolicy();
        $used = OrderEditLog::query()
            ->where('purchase_id', $order->id)
            ->where('action', 'location_updated')
            ->count();

        $max = (int) ($policy->max_location_edits ?? 2);
        $remaining = max(0, $max - $used);
        $deadline = $order->created_at?->copy()->addHours((int) ($policy->location_edit_window_hours ?? 24));

        $blockedStatuses = ['shipped', 'delivered', 'completed', 'cancelled', 'disputed'];
        $until = $policy->location_edit_until_status ?? 'shipped';
        if ($until === 'shipped') {
            $blockedStatuses = ['shipped', 'delivered', 'completed', 'cancelled', 'disputed'];
        }

        $canEdit = $order->buyer_id === $userId
            && (bool) ($policy->location_edit_active ?? true)
            && (bool) ($policy->active ?? true)
            && $remaining > 0
            && $deadline && now()->lte($deadline)
            && ! in_array($order->status, $blockedStatuses, true);

        return [
            'can_edit_location' => $canEdit,
            'location_edits_remaining' => $remaining,
            'location_edit_deadline_at' => $deadline?->toIso8601String(),
            'max_location_edits' => $max,
        ];
    }

    /**
     * @param  array{shipping_address?: string|null, shipping_lat: float|int|string, shipping_lng: float|int|string}  $payload
     */
    public function updateLocation(Purchase $order, User $user, array $payload): Purchase
    {
        $eval = $this->evaluate($order, (int) $user->id);
        if (! $eval['can_edit_location']) {
            throw new InvalidArgumentException('LOCATION_EDIT_NOT_ALLOWED');
        }

        $before = [
            'shipping_address' => $order->shipping_address,
            'shipping_lat' => $order->shipping_lat,
            'shipping_lng' => $order->shipping_lng,
        ];

        $order->update([
            'shipping_address' => array_key_exists('shipping_address', $payload)
                ? ($payload['shipping_address'] ?: null)
                : $order->shipping_address,
            'shipping_lat' => $payload['shipping_lat'],
            'shipping_lng' => $payload['shipping_lng'],
        ]);

        OrderEditLog::create([
            'purchase_id' => $order->id,
            'user_id' => $user->id,
            'action' => 'location_updated',
            'before_json' => $before,
            'after_json' => [
                'shipping_address' => $order->shipping_address,
                'shipping_lat' => $order->shipping_lat,
                'shipping_lng' => $order->shipping_lng,
            ],
        ]);

        return $order->fresh();
    }
}
