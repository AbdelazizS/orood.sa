<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminVisitorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->get('period', 'day'); // day, week, month, year

        $range = match ($period) {
            'week' => [now()->subWeek(), now()],
            'month' => [now()->subMonth(), now()],
            'year' => [now()->subYear(), now()],
            default => [now()->subDay(), now()],
        };

        [$from, $to] = $range;
        $fromStr = $from->format('Y-m-d H:i:s');
        $toStr = $to->format('Y-m-d H:i:s');

        // Total visits (unique sessions)
        $totalVisits = (int) Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->distinct()
            ->count('session_id');

        // Total page views
        $totalPageViews = Visitor::whereBetween('created_at', [$fromStr, $toStr])->count();

        // By day
        $byDay = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as views'), DB::raw('COUNT(DISTINCT session_id) as unique_visits'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => $r->date,
                'views' => (int) $r->views,
                'unique_visits' => (int) $r->unique_visits,
            ])
            ->values()
            ->toArray();

        // Top paths
        $topPaths = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('path', DB::raw('COUNT(*) as count'))
            ->whereNotNull('path')
            ->where('path', '!=', '')
            ->groupBy('path')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['path' => $r->path, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        // Top cities
        $topCities = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('city', DB::raw('COUNT(*) as count'))
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->groupBy('city')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['city' => $r->city, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        // By source
        $bySource = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('source', DB::raw('COUNT(*) as count'))
            ->groupBy('source')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => [
                'source' => $r->source ?? 'direct',
                'count' => (int) $r->count,
            ])
            ->values()
            ->toArray();

        $topUtmSources = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('source', DB::raw('COUNT(*) as count'))
            ->whereNotNull('source')
            ->where('source', '!=', '')
            ->groupBy('source')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['utm_source' => $r->source, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        $topUtmCampaigns = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('utm_campaign', DB::raw('COUNT(*) as count'))
            ->whereNotNull('utm_campaign')
            ->where('utm_campaign', '!=', '')
            ->groupBy('utm_campaign')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['campaign' => $r->utm_campaign, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        $bySocialChannel = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('social_channel', DB::raw('COUNT(*) as count'))
            ->whereNotNull('social_channel')
            ->where('social_channel', '!=', '')
            ->groupBy('social_channel')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['channel' => $r->social_channel, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        $topReferrerHosts = Visitor::whereBetween('created_at', [$fromStr, $toStr])
            ->select('referrer_host', DB::raw('COUNT(*) as count'))
            ->whereNotNull('referrer_host')
            ->where('referrer_host', '!=', '')
            ->groupBy('referrer_host')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['host' => $r->referrer_host, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        $registrationHowHeard = User::query()
            ->whereBetween('created_at', [$fromStr, $toStr])
            ->whereNotNull('how_did_you_hear')
            ->where('how_did_you_hear', '!=', '')
            ->select('how_did_you_hear', DB::raw('COUNT(*) as count'))
            ->groupBy('how_did_you_hear')
            ->orderByDesc('count')
            ->limit(15)
            ->get()
            ->map(fn ($r) => ['label' => $r->how_did_you_hear, 'count' => (int) $r->count])
            ->values()
            ->toArray();

        $marketerTraffic = Visitor::query()
            ->leftJoin('users as marketers', 'marketers.id', '=', 'visitors.last_touch_marketer_id')
            ->whereBetween('visitors.created_at', [$fromStr, $toStr])
            ->whereNotNull('visitors.last_touch_marketer_id')
            ->select('visitors.last_touch_marketer_id', 'marketers.name', DB::raw('COUNT(*) as count'))
            ->groupBy('visitors.last_touch_marketer_id', 'marketers.name')
            ->orderByDesc('count')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'marketer_id' => (int) $r->last_touch_marketer_id,
                'marketer_name' => (string) ($r->name ?? '—'),
                'count' => (int) $r->count,
            ])
            ->values()
            ->toArray();

        $marketerSelectedClients = User::query()
            ->leftJoin('users as marketers', 'marketers.id', '=', 'users.referred_by_marketer_id')
            ->whereBetween('users.created_at', [$fromStr, $toStr])
            ->whereNotNull('users.referred_by_marketer_id')
            ->select('users.id', 'users.name', 'users.email', 'marketers.name as marketer_name')
            ->orderByDesc('users.created_at')
            ->limit(50)
            ->get()
            ->map(fn ($r) => [
                'user_id' => (int) $r->id,
                'user_name' => (string) $r->name,
                'user_email' => (string) $r->email,
                'marketer_name' => (string) ($r->marketer_name ?? '—'),
            ])
            ->values()
            ->toArray();

        return response()->json([
            'data' => [
                'total_visits' => $totalVisits,
                'total_page_views' => $totalPageViews,
                'by_day' => $byDay,
                'top_paths' => $topPaths,
                'top_cities' => $topCities,
                'by_source' => $bySource,
                'top_utm_sources' => $topUtmSources,
                'top_utm_campaigns' => $topUtmCampaigns,
                'by_social_channel' => $bySocialChannel,
                'top_referrer_hosts' => $topReferrerHosts,
                'registration_how_heard' => $registrationHowHeard,
                'marketer_traffic' => $marketerTraffic,
                'marketer_selected_clients' => $marketerSelectedClients,
                'period' => $period,
                'from' => $fromStr,
                'to' => $toStr,
            ],
        ]);
    }
}
