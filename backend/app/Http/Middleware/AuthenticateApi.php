<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApi
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $hashedToken = hash('sha256', $token);
        $user = User::where('api_token', $hashedToken)
            ->where('api_token_expires_at', '>', now())
            ->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired token'], 401);
        }

        if ($user->banned_at) {
            return response()->json(['message' => 'Your account has been banned'], 403);
        }

        if ($user->suspended_at) {
            return response()->json(['message' => 'Your account has been suspended'], 403);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
