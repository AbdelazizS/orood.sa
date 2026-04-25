<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PERMISSIONS = [
        ['name' => 'orders.view', 'group' => 'orders', 'description' => 'View orders in admin'],
        ['name' => 'orders.update_status', 'group' => 'orders', 'description' => 'Update order status and tracking in admin'],
        ['name' => 'orders.refund', 'group' => 'orders', 'description' => 'Process order refunds (reserved for future endpoints)'],
        ['name' => 'orders.dispute_resolve', 'group' => 'orders', 'description' => 'Resolve disputed orders'],
        ['name' => 'finance.approve_withdrawal', 'group' => 'finance', 'description' => 'Approve or reject user withdrawal requests'],
        ['name' => 'users.assign_roles', 'group' => 'users', 'description' => 'Assign permissions to roles'],
    ];

    public function up(): void
    {
        $roleAssignments = [
            'super_admin' => [
                'orders.view', 'orders.update_status', 'orders.refund', 'orders.dispute_resolve',
                'finance.approve_withdrawal', 'users.assign_roles',
            ],
            'admin' => [
                'orders.view', 'orders.update_status', 'orders.refund', 'orders.dispute_resolve',
                'finance.approve_withdrawal', 'users.assign_roles',
            ],
            'manager' => [
                'orders.view', 'orders.update_status',
            ],
        ];

        $idsByName = [];
        foreach (self::PERMISSIONS as $perm) {
            $existingId = DB::table('permissions')->where('name', $perm['name'])->value('id');
            if ($existingId) {
                $idsByName[$perm['name']] = $existingId;
                continue;
            }
            $idsByName[$perm['name']] = DB::table('permissions')->insertGetId([
                'name' => $perm['name'],
                'group' => $perm['group'],
                'description' => $perm['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($roleAssignments as $role => $names) {
            foreach ($names as $name) {
                $id = $idsByName[$name] ?? null;
                if (!$id) {
                    continue;
                }
                DB::table('role_permission')->updateOrInsert(
                    ['role' => $role, 'permission_id' => $id],
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
