<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permId = DB::table('permissions')->where('name', 'seo.manage')->value('id');
        if (! $permId) {
            $permId = DB::table('permissions')->insertGetId([
                'name' => 'seo.manage',
                'group' => 'seo',
                'description' => 'Manage SEO settings, meta, and sitemaps',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $viewId = DB::table('permissions')->where('name', 'seo.view_reports')->value('id');
        if (! $viewId) {
            $viewId = DB::table('permissions')->insertGetId([
                'name' => 'seo.view_reports',
                'group' => 'seo',
                'description' => 'View SEO audit reports',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (['super_admin', 'admin'] as $role) {
            foreach ([$permId, $viewId] as $id) {
                DB::table('role_permission')->updateOrInsert(
                    ['role' => $role, 'permission_id' => $id],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->whereIn('name', ['seo.manage', 'seo.view_reports'])->pluck('id');
        if ($ids->isNotEmpty()) {
            DB::table('role_permission')->whereIn('permission_id', $ids)->delete();
            DB::table('permissions')->whereIn('id', $ids)->delete();
        }
    }
};
