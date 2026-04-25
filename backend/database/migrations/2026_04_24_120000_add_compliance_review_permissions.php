<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function ensurePermission(string $name, string $group, string $description): int
    {
        $id = DB::table('permissions')->where('name', $name)->value('id');
        if ($id) {
            return (int) $id;
        }

        return (int) DB::table('permissions')->insertGetId([
            'name' => $name,
            'group' => $group,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function attachToRoles(int $permissionId, array $roles): void
    {
        foreach ($roles as $role) {
            DB::table('role_permission')->updateOrInsert(
                ['role' => $role, 'permission_id' => $permissionId],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function up(): void
    {
        $roles = ['super_admin', 'admin', 'manager', 'moderator'];

        $gid = $this->ensurePermission(
            'compliance.review_guarantee_requests',
            'compliance',
            'Review and approve or reject member financial guarantee deposit/refund requests'
        );
        $this->attachToRoles($gid, $roles);

        $vid = $this->ensurePermission(
            'compliance.review_document_verifications',
            'compliance',
            'Review member ID and company document verification submissions'
        );
        $this->attachToRoles($vid, $roles);
    }

    public function down(): void
    {
        foreach (['compliance.review_guarantee_requests', 'compliance.review_document_verifications'] as $name) {
            $id = DB::table('permissions')->where('name', $name)->value('id');
            if ($id) {
                DB::table('role_permission')->where('permission_id', $id)->delete();
                DB::table('permissions')->where('id', $id)->delete();
            }
        }
    }
};
