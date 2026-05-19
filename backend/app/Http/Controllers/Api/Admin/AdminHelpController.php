<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HelpBlock;
use App\Models\HelpCategory;
use App\Services\Support\SupportCmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminHelpController extends Controller
{
    public function __construct(private readonly SupportCmsService $cms) {}

    public function getSupportSettings(): JsonResponse
    {
        return response()->json(['data' => $this->cms->settings()]);
    }

    public function updateSupportSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'support_email' => ['nullable', 'email'],
            'whatsapp' => ['nullable', 'string', 'max:64'],
            'telegram' => ['nullable', 'string', 'max:64'],
            'phone' => ['nullable', 'string', 'max:32'],
            'hours_ar' => ['nullable', 'string'],
            'hours_en' => ['nullable', 'string'],
            'emergency_notice_ar' => ['nullable', 'string'],
            'emergency_notice_en' => ['nullable', 'string'],
        ]);

        $row = $this->cms->updateSettings($validated, $request->user()?->id);

        return response()->json(['data' => $row]);
    }

    public function indexBlocks(Request $request): JsonResponse
    {
        $pageKey = $request->query('page_key', 'dashboard_help');
        $blocks = HelpBlock::query()
            ->where('page_key', $pageKey)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $blocks]);
    }

    public function storeBlock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_key' => ['required', 'string', 'max:64'],
            'block_type' => ['required', 'string', 'max:64'],
            'config_json' => ['required', 'array'],
            'sort_order' => ['integer', 'min:0'],
            'visible' => ['boolean'],
        ]);

        $block = HelpBlock::create($validated);

        return response()->json(['data' => $block], 201);
    }

    public function updateBlock(Request $request, HelpBlock $helpBlock): JsonResponse
    {
        $validated = $request->validate([
            'block_type' => ['sometimes', 'string', 'max:64'],
            'config_json' => ['sometimes', 'array'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'visible' => ['sometimes', 'boolean'],
        ]);

        $helpBlock->update($validated);

        return response()->json(['data' => $helpBlock->fresh()]);
    }

    public function reorderBlocks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ordered_ids' => ['required', 'array'],
            'ordered_ids.*' => ['integer', 'exists:help_blocks,id'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ordered_ids'] as $index => $id) {
                HelpBlock::where('id', $id)->update(['sort_order' => $index + 1]);
            }
        });

        return response()->json(['message' => __('settings.updated')]);
    }

    public function indexCategories(): JsonResponse
    {
        return response()->json([
            'data' => HelpCategory::with('articles')->orderBy('sort_order')->get(),
        ]);
    }
}
