<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Subscriber accounts are hidden from customers, so they can't post anything that shows their name
 * (new conversations, bids, comments, reviews, purchases, view requests).
 * They talk to the Arooth team through /subscriber/support-conversation instead.
 */
class EnsureNotSubscriber
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isSubscriber()) {
            return response()->json([
                'message' => 'حساب المشترك لا يمكنه القيام بهذا الإجراء. تواصل مع الإدارة من لوحة المشترك.',
            ], 403);
        }

        return $next($request);
    }
}
