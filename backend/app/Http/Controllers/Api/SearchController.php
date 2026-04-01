<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SearchService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(private SearchService $searchService)
    {
    }

    public function __invoke(Request $request)
    {
        $query = $request->get('q', '');
        $results = $this->searchService->autocomplete($query);

        return response()->json([
            'data' => $results,
        ]);
    }
}
