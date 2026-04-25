<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'offers.view', 'group' => 'offers', 'description' => 'View offers/products'],
            ['name' => 'offers.create', 'group' => 'offers', 'description' => 'Create offers'],
            ['name' => 'offers.update', 'group' => 'offers', 'description' => 'Update offers'],
            ['name' => 'offers.delete', 'group' => 'offers', 'description' => 'Delete offers'],
            ['name' => 'categories.view', 'group' => 'categories', 'description' => 'View categories'],
            ['name' => 'categories.create', 'group' => 'categories', 'description' => 'Create categories'],
            ['name' => 'categories.update', 'group' => 'categories', 'description' => 'Update categories'],
            ['name' => 'categories.delete', 'group' => 'categories', 'description' => 'Delete categories'],
            ['name' => 'regions.view', 'group' => 'regions', 'description' => 'View regions'],
            ['name' => 'regions.create', 'group' => 'regions', 'description' => 'Create regions'],
            ['name' => 'regions.update', 'group' => 'regions', 'description' => 'Update regions'],
            ['name' => 'regions.delete', 'group' => 'regions', 'description' => 'Delete regions'],
            ['name' => 'users.view', 'group' => 'users', 'description' => 'View users'],
            ['name' => 'users.update', 'group' => 'users', 'description' => 'Update users'],
            ['name' => 'users.delete', 'group' => 'users', 'description' => 'Delete users'],
            ['name' => 'roles.manage', 'group' => 'roles', 'description' => 'Manage roles and permissions'],
            ['name' => 'audit.view', 'group' => 'audit', 'description' => 'View audit logs'],
            ['name' => 'settings.view', 'group' => 'settings', 'description' => 'View platform settings'],
            ['name' => 'settings.update', 'group' => 'settings', 'description' => 'Update platform settings'],
            ['name' => 'bids.place', 'group' => 'bids', 'description' => 'Place bids on listings'],
            ['name' => 'bids.withdraw', 'group' => 'bids', 'description' => 'Withdraw own pending bids'],
            ['name' => 'bids.visibility', 'group' => 'bids', 'description' => 'Toggle own bid visibility'],
            ['name' => 'bids.review_listing', 'group' => 'bids', 'description' => 'Review and process bids on own listings'],
            ['name' => 'bids.create_order', 'group' => 'bids', 'description' => 'Create order from accepted bid'],
            ['name' => 'bids.admin_view', 'group' => 'bids', 'description' => 'Admin view/search bids'],
            ['name' => 'bids.admin_manage', 'group' => 'bids', 'description' => 'Admin hide/delete bids'],
            ['name' => 'bids.admin_audit', 'group' => 'bids', 'description' => 'Admin access bid audit timeline'],
            ['name' => 'tasks.view', 'group' => 'tasks', 'description' => 'View tasks'],
            ['name' => 'tasks.create', 'group' => 'tasks', 'description' => 'Create tasks'],
            ['name' => 'tasks.assign', 'group' => 'tasks', 'description' => 'Assign and reassign tasks'],
            ['name' => 'tasks.update', 'group' => 'tasks', 'description' => 'Update task content and progress'],
            ['name' => 'tasks.close', 'group' => 'tasks', 'description' => 'Mark tasks done, reopen, or delete tasks'],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(['name' => $p['name']], $p);
        }

        $adminRoles = ['super_admin', 'admin', 'manager'];
        $allPermissionIds = Permission::pluck('id')->toArray();
        $employeePermIds = Permission::whereIn('name', [
            'offers.view', 'offers.update',
            'categories.view', 'regions.view', 'regions.update',
            'users.view', 'users.update',
            'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.update',
        ])->pluck('id')->toArray();

        foreach ($adminRoles as $role) {
            foreach ($allPermissionIds as $permId) {
                DB::table('role_permission')->updateOrInsert(
                    ['role' => $role, 'permission_id' => $permId],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
        foreach ($employeePermIds as $permId) {
            DB::table('role_permission')->updateOrInsert(
                ['role' => 'employee', 'permission_id' => $permId],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }

        $memberRolePermissions = [
            'user' => ['bids.place', 'bids.withdraw', 'bids.visibility', 'bids.review_listing'],
            'buyer' => ['bids.place', 'bids.withdraw', 'bids.visibility', 'bids.create_order'],
            'seller' => ['bids.place', 'bids.withdraw', 'bids.visibility', 'bids.review_listing'],
            'company_buyer' => ['bids.place', 'bids.withdraw', 'bids.visibility', 'bids.create_order'],
            'company_seller' => ['bids.place', 'bids.withdraw', 'bids.visibility', 'bids.review_listing'],
            'moderator' => [],
        ];
        foreach ($memberRolePermissions as $role => $permNames) {
            $permIds = Permission::whereIn('name', $permNames)->pluck('id')->all();
            foreach ($permIds as $permId) {
                DB::table('role_permission')->updateOrInsert(
                    ['role' => $role, 'permission_id' => $permId],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }
}
