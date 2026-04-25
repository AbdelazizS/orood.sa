<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PERMISSIONS = [
        ['name' => 'tasks.view', 'group' => 'tasks', 'description' => 'View tasks'],
        ['name' => 'tasks.create', 'group' => 'tasks', 'description' => 'Create tasks'],
        ['name' => 'tasks.assign', 'group' => 'tasks', 'description' => 'Assign and reassign tasks'],
        ['name' => 'tasks.update', 'group' => 'tasks', 'description' => 'Update task content and progress'],
        ['name' => 'tasks.close', 'group' => 'tasks', 'description' => 'Mark tasks done, reopen, or delete tasks'],
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
            'super_admin' => ['tasks.view', 'tasks.create', 'tasks.assign', 'tasks.update', 'tasks.close'],
            'admin' => ['tasks.view', 'tasks.create', 'tasks.assign', 'tasks.update', 'tasks.close'],
            'manager' => ['tasks.view', 'tasks.create', 'tasks.assign', 'tasks.update', 'tasks.close'],
            'employee' => ['tasks.view', 'tasks.create', 'tasks.assign', 'tasks.update'],
            'moderator' => ['tasks.view'],
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
