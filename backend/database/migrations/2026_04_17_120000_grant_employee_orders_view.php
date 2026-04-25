<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $permId = DB::table('permissions')->where('name', 'orders.view')->value('id');
        if (!$permId) {
            return;
        }

        DB::table('role_permission')->updateOrInsert(
            ['role' => 'employee', 'permission_id' => $permId],
            ['created_at' => now(), 'updated_at' => now()]
        );
    }

    public function down(): void
    {
        $permId = DB::table('permissions')->where('name', 'orders.view')->value('id');
        if (!$permId) {
            return;
        }

        DB::table('role_permission')
            ->where('role', 'employee')
            ->where('permission_id', $permId)
            ->delete();
    }
};
