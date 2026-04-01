<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
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

        return response()->json([
            'data' => [
                'total_visits' => $totalVisits,
                'total_page_views' => $totalPageViews,
                'by_day' => $byDay,
                'top_paths' => $topPaths,
                'top_cities' => $topCities,
                'by_source' => $bySource,
                'period' => $period,
                'from' => $fromStr,
                'to' => $toStr,
            ],
        ]);
    }
}
