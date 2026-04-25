<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetRequestLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = (string) $request->header('Accept-Language', '');
        $locale = str_starts_with(strtolower($header), 'ar') ? 'ar' : 'en';
        app()->setLocale($locale);

        return $next($request);
    }
}

