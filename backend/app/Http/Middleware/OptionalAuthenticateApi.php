<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the authenticated user from a Bearer API token when present and valid,
 * without returning 401 when missing or invalid (for public routes that still
 * need owner/staff context).
 */
class OptionalAuthenticateApi
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return $next($request);
        }

        $hashedToken = hash('sha256', $token);
        $user = User::where('api_token', $hashedToken)
            ->where('api_token_expires_at', '>', now())
            ->first();

        if ($user && ! $user->banned_at && ! $user->suspended_at) {
            $request->setUserResolver(fn () => $user);
        }

        return $next($request);
    }
}
