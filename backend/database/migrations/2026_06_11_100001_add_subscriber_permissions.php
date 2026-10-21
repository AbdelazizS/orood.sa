<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PERMISSIONS = [
        ['name' => 'subscribers.manage', 'group' => 'subscribers', 'description' => 'Create subscriber accounts and add ad credits'],
        ['name' => 'subscribers.notes', 'group' => 'subscribers', 'description' => 'View subscriber listings and write private follow-up notes'],
    ];

    public function up(): void
    {
        $idsByName = [];
        foreach (self::PERMISSIONS as $perm) {
            $existingId = DB::table('permissions')->where('name', $perm['name'])->value('id');
            if ($existingId) {
                $idsByName[$perm['name']] = (int) $existingId;
                continue;
            }
            $idsByName[$perm['name']] = (int) DB::table('permissions')->insertGetId([
                'name' => $perm['name'],
                'group' => $perm['group'],
                'description' => $perm['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $roleAssignments = [
            'super_admin' => ['subscribers.manage', 'subscribers.notes'],
            'admin' => ['subscribers.manage', 'subscribers.notes'],
            'manager' => ['subscribers.manage', 'subscribers.notes'],
            'employee' => ['subscribers.notes'],
            'moderator' => ['subscribers.notes'],
        ];

        foreach ($roleAssignments as $role => $names) {
            foreach ($names as $name) {
                $permissionId = $idsByName[$name] ?? null;
                if (! $permissionId) {
                    continue;
                }
                DB::table('role_permission')->updateOrInsert(
                    ['role' => $role, 'permission_id' => $permissionId],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        $names = array_column(self::PERMISSIONS, 'name');
        $ids = DB::table('permissions')->whereIn('name', $names)->pluck('id');
        if ($ids->isNotEmpty()) {
            DB::table('role_permission')->whereIn('permission_id', $ids)->delete();
            DB::table('permissions')->whereIn('id', $ids)->delete();
        }
    }
};
