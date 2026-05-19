<?php

namespace App\Services;

use App\Enums\AssistantUserType;
use App\Models\Assistant;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AssistantUserTypeScope
{
    private const PLATFORM_STAFF_ROLES = [
        'super_admin', 'admin', 'manager', 'employee', 'moderator', 'assistant',
    ];

    public function resolveForUser(User $user): ?Assistant
    {
        if ($user->role !== 'assistant') {
            return null;
        }

        return Assistant::query()
            ->where('user_id', $user->id)
            ->where('status', Assistant::STATUS_ACTIVE)
            ->first();
    }

    /** @return list<string>|null null = no restriction (full access to member types) */
    public function assignedTypesForUser(User $user): ?array
    {
        $assistant = $this->resolveForUser($user);
        if (! $assistant) {
            return null;
        }

        $types = $assistant->assignedUserTypes();
        if ($types === []) {
            return [];
        }

        return $types;
    }

    /**
     * Restrict a users query to marketplace members the assistant may serve.
     *
     * @param  Builder<User>  $query
     */
    public function applyToUsersQuery(Builder $query, User $actingUser): void
    {
        $types = $this->assignedTypesForUser($actingUser);
        if ($types === null) {
            return;
        }

        if ($types === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function (Builder $outer) use ($types) {
            foreach ($types as $type) {
                $outer->orWhere(function (Builder $q) use ($type) {
                    $this->applySingleType($q, $type);
                });
            }
        });
    }

    /** @param  Builder<User>  $query */
    private function applySingleType(Builder $query, string $type): void
    {
        match ($type) {
            AssistantUserType::INDIVIDUAL->value => $query
                ->whereNotIn('role', self::PLATFORM_STAFF_ROLES)
                ->where('role', '!=', 'company')
                ->where('role', '!=', 'marketer')
                ->whereDoesntHave('company', fn (Builder $c) => $c->where('verification_status', 'approved')),
            AssistantUserType::COMPANY->value => $query->where(function (Builder $q) {
                $q->where('role', 'company')
                    ->orWhereHas('company');
            }),
            AssistantUserType::MARKETER->value => $query->where('role', 'marketer'),
            AssistantUserType::ADMIN->value => $query->whereIn('role', self::PLATFORM_STAFF_ROLES),
            default => $query,
        };
    }
}
