<?php

namespace App\Http\Middleware;

use App\Services\AdminSettingsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureWholesaleEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $enabled = app(AdminSettingsService::class)->getBool(AdminSettingsService::KEY_WHOLESALE_ENABLED, true);
        if (! $enabled) {
            return response()->json([
                'message' => __('wholesale.feature_disabled'),
                'code' => 'wholesale_disabled',
            ], 404);
        }

        return $next($request);
    }
}
