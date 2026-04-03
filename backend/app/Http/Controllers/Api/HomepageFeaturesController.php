<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class HomepageFeaturesController extends Controller
{
    /**
     * Returns which homepage features to show (سعر الجملة, دليل الشركات).
     * Admin can enable/disable per category and per region.
     */
    public function __invoke(): JsonResponse
    {
        $companyDirectoryEnabled = Category::where('show_company_directory', true)
            ->where('is_active', true)
            ->exists();

        $wholesaleEnabled = \DB::table('category_region')
            ->where('wholesale_visible', true)
            ->exists();

        return response()->json([
            'data' => [
                'show_company_directory' => $companyDirectoryEnabled,
                'show_wholesale' => $wholesaleEnabled,
            ],
        ]);
    }
}
