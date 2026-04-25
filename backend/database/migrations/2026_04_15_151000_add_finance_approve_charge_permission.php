<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissionId = DB::table('permissions')->where('name', 'finance.approve_charge')->value('id');
        if (!$permissionId) {
            $permissionId = DB::table('permissions')->insertGetId([
                'name' => 'finance.approve_charge',
                'group' => 'finance',
                'description' => 'Approve or reject user charge requests',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (['super_admin', 'admin'] as $role) {
            DB::table('role_permission')->updateOrInsert(
                ['role' => $role, 'permission_id' => $permissionId],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('name', 'finance.approve_charge')->value('id');
        if ($permissionId) {
            DB::table('role_permission')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
