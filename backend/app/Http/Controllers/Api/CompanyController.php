<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Models\Company;

class CompanyController extends Controller
{
    public function index()
    {
        $companies = Company::query()
            ->with(['category', 'region', 'city'])
            ->orderByDesc('rating')
            ->paginate(12);

        return CompanyResource::collection($companies);
    }
}
