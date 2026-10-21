<?php

namespace App\Services\Subscribers;

use App\Models\Notification;
use App\Models\User;

/**
 * In-app notifications between subscribers and the Arooth team that manages them.
 */
class SubscriberStaffNotifier
{
    /** Roles that hold subscribers.manage by default (see the permissions migration). */
    private const MANAGER_ROLES = ['super_admin', 'admin', 'manager'];

    /**
     * @param  array<string, mixed>  $data
     */
    public function notifyManagers(string $type, string $title, string $body, array $data = []): void
    {
        User::query()
            ->whereIn('role', self::MANAGER_ROLES)
            ->whereNull('banned_at')
            ->pluck('id')
            ->each(fn ($id) => Notification::create([
                'user_id' => $id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'data' => $data,
            ]));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function notifySubscriber(int $subscriberId, string $type, string $title, string $body, array $data = []): void
    {
        Notification::create([
            'user_id' => $subscriberId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);
    }

    /** The account a subscriber's "contact the admins" conversation goes to. */
    public function supportAdmin(): ?User
    {
        return User::query()
            ->whereIn('role', ['admin', 'super_admin'])
            ->whereNull('banned_at')
            ->orderByRaw("CASE WHEN role = 'admin' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->first();
    }
}
