<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitorController extends Controller
{
    /**
     * Track a page visit (public, no auth required).
     */
    public function track(Request $request): JsonResponse
    {
        $path = $request->get('path', '/');
        $source = $request->get('utm_source') ?? $request->get('source');

        $sessionId = $request->header('X-Session-ID') ?? $request->get('session_id');

        Visitor::create([
            'session_id' => $sessionId ? substr($sessionId, 0, 64) : null,
            'path' => substr($path, 0, 500),
            'ip' => $request->ip(),
            'user_agent' => substr($request->userAgent(), 0, 500),
            'source' => $source ? substr($source, 0, 100) : null,
            'user_id' => $request->user()?->id,
        ]);

        return response()->json(['ok' => true]);
    }
}
