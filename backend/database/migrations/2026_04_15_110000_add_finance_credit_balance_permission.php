<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('permissions')->where('name', 'finance.credit_balance')->exists()) {
            return;
        }

        $id = DB::table('permissions')->insertGetId([
            'name' => 'finance.credit_balance',
            'group' => 'finance',
            'description' => 'Credit user wallet balances (available or withdrawable)',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (['super_admin', 'admin'] as $role) {
            DB::table('role_permission')->updateOrInsert(
                ['role' => $role, 'permission_id' => $id],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'finance.credit_balance')->value('id');
        if ($id) {
            DB::table('role_permission')->where('permission_id', $id)->delete();
            DB::table('permissions')->where('id', $id)->delete();
        }
    }
};
