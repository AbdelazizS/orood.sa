<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageVisit;
use App\Models\Product;
use App\Models\User;
use App\Models\Visitor;
use Carbon\Carbon;
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
        $normalizedPath = $this->normalizePath($path);
        $utmSource = $request->get('utm_source');
        $utmMedium = $request->get('utm_medium');
        $utmCampaign = $request->get('utm_campaign');
        $referrerUrl = $request->get('referrer');
        $socialChannel = $request->get('social_channel');
        $marketerHint = $request->get('marketer');

        $referrerHost = $request->get('referrer_host');
        $referrerPath = $request->get('referrer_path');
        if ($referrerUrl && (!$referrerHost || !$referrerPath)) {
            $parts = parse_url($referrerUrl);
            $referrerHost = $referrerHost ?? ($parts['host'] ?? null);
            $referrerPath = $referrerPath ?? ($parts['path'] ?? null);
        }

        $source = $utmSource
            ?? $request->get('source')
            ?? $this->detectSourceFromReferrer((string) ($referrerHost ?? ''));

        $sessionId = $request->header('X-Session-ID') ?? $request->get('session_id');
        $visitorUserId = $request->user()?->id;
        $ipAddress = (string) $request->ip();
        $userAgent = substr((string) ($request->userAgent() ?? ''), 0, 300);
        $marketerId = $this->resolveMarketerId($marketerHint);

        $firstTouch = null;
        if ($sessionId) {
            $firstTouch = Visitor::query()
                ->where('session_id', substr((string) $sessionId, 0, 64))
                ->orderBy('id')
                ->first();
        }

        $firstTouchSource = $firstTouch?->first_touch_source
            ?? $firstTouch?->source
            ?? ($source ? substr((string) $source, 0, 100) : null);
        $firstTouchMarketerId = $firstTouch?->first_touch_marketer_id
            ?? $firstTouch?->last_touch_marketer_id
            ?? $marketerId;

        Visitor::create([
            'session_id' => $sessionId ? substr((string) $sessionId, 0, 64) : null,
            'path' => substr((string) $normalizedPath, 0, 500),
            'ip' => $ipAddress,
            'user_agent' => $userAgent,
            'source' => $source ? substr((string) $source, 0, 100) : null,
            'first_touch_source' => $firstTouchSource,
            'last_touch_source' => $source ? substr((string) $source, 0, 100) : null,
            'utm_medium' => $utmMedium ? substr((string) $utmMedium, 0, 120) : null,
            'utm_campaign' => $utmCampaign ? substr((string) $utmCampaign, 0, 120) : null,
            'referrer_host' => $referrerHost ? substr((string) $referrerHost, 0, 255) : null,
            'referrer_path' => $referrerPath ? substr((string) $referrerPath, 0, 500) : null,
            'social_channel' => $socialChannel ? substr((string) $socialChannel, 0, 50) : null,
            'user_id' => $visitorUserId,
            'first_touch_marketer_id' => $firstTouchMarketerId,
            'last_touch_marketer_id' => $marketerId,
        ]);

        $resolvedTarget = $this->resolvePageVisitTarget($normalizedPath);
        if ($resolvedTarget !== null) {
            $ownerId = (int) $resolvedTarget['profile_id'];
            if ($visitorUserId === null || (int) $visitorUserId !== $ownerId) {
                $isDuplicate = $this->hasRecentEquivalentVisit(
                    profileId: $ownerId,
                    productId: $resolvedTarget['product_id'],
                    visitorId: $visitorUserId,
                    ipAddress: $ipAddress,
                    userAgent: $userAgent
                );

                if (! $isDuplicate) {
                    PageVisit::create([
                        'profile_id' => $ownerId,
                        'product_id' => $resolvedTarget['product_id'],
                        'visitor_id' => $visitorUserId,
                        'source' => $source ? substr((string) $source, 0, 100) : null,
                        'ip_address' => $ipAddress,
                        'user_agent' => $userAgent,
                    ]);
                }
            }
        }

        return response()->json(['ok' => true]);
    }

    private function resolveMarketerId(mixed $hint): ?int
    {
        $value = trim((string) ($hint ?? ''));
        if ($value === '') {
            return null;
        }

        $query = User::query()->where('role', 'marketer');
        if (is_numeric($value)) {
            return $query->whereKey((int) $value)->value('id');
        }

        return $query
            ->where(function ($q) use ($value) {
                $q->where('username', $value)->orWhere('name', $value);
            })
            ->value('id');
    }

    private function normalizePath(mixed $rawPath): string
    {
        $path = trim((string) $rawPath);
        if ($path === '') {
            return '/';
        }

        $parsedPath = parse_url($path, PHP_URL_PATH);
        if (! is_string($parsedPath) || $parsedPath === '') {
            return '/';
        }

        return str_starts_with($parsedPath, '/') ? $parsedPath : '/' . $parsedPath;
    }

    private function detectSourceFromReferrer(string $referrerHost): string
    {
        $ref = strtolower($referrerHost);
        return match (true) {
            str_contains($ref, 'facebook') => 'facebook',
            str_contains($ref, 'twitter') || str_contains($ref, 'x.com') => 'twitter',
            str_contains($ref, 'whatsapp') => 'whatsapp',
            str_contains($ref, 'linkedin') => 'linkedin',
            str_contains($ref, 'youtube') => 'youtube',
            $ref === '' => 'direct',
            default => 'other',
        };
    }

    /**
     * @return array{profile_id:int,product_id:int|null}|null
     */
    private function resolvePageVisitTarget(string $path): ?array
    {
        if (preg_match('#^/profile/by-id/(\d+)$#', $path, $matches) === 1) {
            $profileId = (int) $matches[1];
            return User::whereKey($profileId)->exists()
                ? ['profile_id' => $profileId, 'product_id' => null]
                : null;
        }

        if (preg_match('#^/profile/([^/]+)$#', $path, $matches) === 1) {
            $identifier = urldecode($matches[1]);
            $profileId = is_numeric($identifier)
                ? User::whereKey((int) $identifier)->value('id')
                : User::where('username', $identifier)->value('id');
            return $profileId
                ? ['profile_id' => (int) $profileId, 'product_id' => null]
                : null;
        }

        if (preg_match('#^/products/(\d+)$#', $path, $matches) === 1) {
            $product = Product::query()
                ->select(['id', 'user_id', 'status', 'moderation_status'])
                ->whereKey((int) $matches[1])
                ->first();
            if (! $product || ! $product->isPubliclyListed()) {
                return null;
            }

            return [
                'profile_id' => (int) $product->user_id,
                'product_id' => (int) $product->id,
            ];
        }

        return null;
    }

    private function hasRecentEquivalentVisit(
        int $profileId,
        ?int $productId,
        ?int $visitorId,
        string $ipAddress,
        string $userAgent
    ): bool {
        $query = PageVisit::query()
            ->where('profile_id', $profileId)
            ->where('product_id', $productId)
            ->where('created_at', '>=', Carbon::now()->subSeconds(45));

        if ($visitorId !== null) {
            $query->where('visitor_id', $visitorId);
        } else {
            $query->whereNull('visitor_id')
                ->where('ip_address', $ipAddress)
                ->where('user_agent', $userAgent);
        }

        return $query->exists();
    }
}
