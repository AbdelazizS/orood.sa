<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CanCreateListing
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'يجب تسجيل الدخول'], 401);
        }

        if ($user->isBanned()) {
            return response()->json(['message' => 'حسابك محظور ولا يمكنك إنشاء إعلانات'], 403);
        }

        $role = UserRole::tryFrom($user->role);
        if ($role && $role->isPlatformManager()) {
            return response()->json(['message' => 'لا يمكن لموظفي المنصة إنشاء إعلانات'], 403);
        }

        return $next($request);
    }
}
