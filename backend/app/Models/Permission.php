<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class Permission extends Model
{
    protected $fillable = ['name', 'group', 'description'];

    public static function getForRole(string $role): array
    {
        return Cache::remember("role_permissions:{$role}", 300, function () use ($role) {
            return DB::table('role_permission')
                ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
                ->where('role_permission.role', $role)
                ->pluck('permissions.name')
                ->toArray();
        });
    }

    /** @return list<string> */
    public static function getForUser(User $user): array
    {
        if ($user->role === 'super_admin') {
            return ['*'];
        }

        if ($user->role === 'assistant') {
            return app(\App\Services\AssistantPermissionService::class)->permissionsForUser($user);
        }

        return self::getForRole((string) $user->role);
    }

    public static function syncForRole(string $role, array $permissionIds): void
    {
        DB::table('role_permission')->where('role', $role)->delete();
        foreach ($permissionIds as $id) {
            DB::table('role_permission')->insert([
                'role' => $role,
                'permission_id' => $id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        Cache::forget("role_permissions:{$role}");
    }

    /**
     * User IDs that should receive in-app alerts for a permission.
     * Matches {@see \App\Http\Middleware\EnsureUserHasPermission}: every super_admin plus roles linked in role_permission.
     */
    public static function userIdsHavingPermission(string $permissionName): array
    {
        $permissionId = DB::table('permissions')->where('name', $permissionName)->value('id');
        if (! $permissionId) {
            return User::query()->where('role', 'super_admin')->pluck('id')->all();
        }

        $roles = DB::table('role_permission')
            ->where('permission_id', $permissionId)
            ->pluck('role')
            ->all();

        $rolesForQuery = array_values(array_unique(array_merge($roles, ['super_admin'])));

        return User::query()
            ->whereIn('role', $rolesForQuery)
            ->pluck('id')
            ->unique()
            ->values()
            ->all();
    }
}
