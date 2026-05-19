<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContactInquiryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function __construct(private readonly ContactInquiryService $inquiries) {}

    public function store(Request $request): JsonResponse
    {
        $inquiry = $this->inquiries->submit(
            $request->except(array_keys($request->allFiles())),
            $request->allFiles(),
        );

        $settings = app(\App\Services\AdminSettingsService::class);
        $locale = $request->header('Accept-Language') === 'en' ? 'en' : 'ar';
        $success = $settings->contactPagePublic($locale)['success_message'] ?? __('contact.submitted');

        return response()->json([
            'message' => $success,
            'data' => ['id' => $inquiry->id],
        ], 201);
    }
}
