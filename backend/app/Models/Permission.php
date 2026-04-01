<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Permission extends Model
{
    protected $fillable = ['name', 'group', 'description'];

    public static function getForRole(string $role): array
    {
        return DB::table('role_permission')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->where('role_permission.role', $role)
            ->pluck('permissions.name')
            ->toArray();
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
    }
}
