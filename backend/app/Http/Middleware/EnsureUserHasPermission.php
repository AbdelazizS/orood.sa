<?php

namespace App\Http\Middleware;

use App\Models\Permission;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ($user->role === 'super_admin') {
            return $next($request);
        }

        $cacheKey = $user->role === 'assistant'
            ? "user_permissions:{$user->id}"
            : "role_permissions:{$user->role}";

        $permissions = Cache::remember(
            $cacheKey,
            now()->addMinutes(5),
            fn () => Permission::getForUser($user)
        );
        if (!in_array($permission, $permissions, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
