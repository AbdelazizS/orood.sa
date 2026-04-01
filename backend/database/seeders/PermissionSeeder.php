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
    }
}
