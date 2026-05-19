<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permId = DB::table('permissions')->where('name', 'assistants.manage')->value('id');
        if (! $permId) {
            $permId = DB::table('permissions')->insertGetId([
                'name' => 'assistants.manage',
                'group' => 'assistants',
                'description' => 'Create and manage platform assistants',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (['super_admin', 'admin'] as $role) {
            DB::table('role_permission')->updateOrInsert(
                ['role' => $role, 'permission_id' => $permId],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        $permId = DB::table('permissions')->where('name', 'assistants.manage')->value('id');
        if ($permId) {
            DB::table('role_permission')->where('permission_id', $permId)->delete();
            DB::table('permissions')->where('id', $permId)->delete();
        }
    }
};
