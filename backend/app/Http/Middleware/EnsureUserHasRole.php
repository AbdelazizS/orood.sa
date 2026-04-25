<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Support both `role:super_admin,admin` (single arg with commas) and multiple args.
        $allowed = [];
        foreach ($roles as $chunk) {
            foreach (preg_split('/\s*,\s*/', (string) $chunk, -1, PREG_SPLIT_NO_EMPTY) as $part) {
                $allowed[] = $part;
            }
        }
        if ($allowed === []) {
            $allowed = ['super_admin', 'admin'];
        }

        if (!in_array($user->role, $allowed, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
