<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPermissionController extends Controller
{
    private const ROLES = ['super_admin', 'admin', 'manager', 'employee', 'seller', 'buyer', 'user'];

    public function index(): JsonResponse
    {
        $permissions = Permission::orderBy('group')->orderBy('name')->get();
        return response()->json(['data' => $permissions]);
    }

    public function roles(): JsonResponse
    {
        return response()->json(['data' => self::ROLES]);
    }

    public function rolePermissions(string $role): JsonResponse
    {
        $ids = \Illuminate\Support\Facades\DB::table('role_permission')
            ->where('role', $role)
            ->pluck('permission_id');
        return response()->json(['data' => $ids]);
    }

    public function syncRole(Request $request, string $role): JsonResponse
    {
        if (!in_array($role, self::ROLES)) {
            return response()->json(['message' => 'Invalid role'], 422);
        }
        $validated = $request->validate([
            'permission_ids' => ['required', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);
        Permission::syncForRole($role, $validated['permission_ids']);
        return response()->json(['message' => 'Permissions updated']);
    }
}
