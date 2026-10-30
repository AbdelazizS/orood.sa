<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ListingFeedback;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * «قيّم هذا المنتج»: buyers who received the item (or dealt with the seller about it) answer
 * «مطابق للصور؟» and «سرعة التوصيل/الإنجاز»; the listing shows the percentages.
 */
class ListingFeedbackController extends Controller
{
    /** GET /listings/{listing}/feedback/mine — can I rate, and my current answer. */
    public function mine(Request $request, Product $listing): JsonResponse
    {
        $user = $request->user();
        $eligibility = ListingFeedback::eligibility($listing, $user);
        $mine = $user
            ? ListingFeedback::query()->where('product_id', $listing->id)->where('user_id', $user->id)->first()
            : null;

        return response()->json(['data' => [
            'can_rate' => $eligibility['can'],
            'verified_purchase' => $eligibility['verified'],
            'reason' => $eligibility['reason'],
            'mine' => $mine ? [
                'matches_photos' => $mine->matches_photos,
                'delivery_speed' => $mine->delivery_speed,
                'comment' => $mine->comment,
            ] : null,
        ]]);
    }

    /** POST /listings/{listing}/feedback — create or update my answers. */
    public function store(Request $request, Product $listing): JsonResponse
    {
        $validated = $request->validate([
            'matches_photos' => ['required', 'boolean'],
            'delivery_speed' => ['required', Rule::in(ListingFeedback::SPEEDS)],
            'comment' => ['nullable', 'string', 'max:500'],
        ], [
            'matches_photos.required' => 'اختر هل المنتج مطابق للصور.',
            'delivery_speed.required' => 'اختر سرعة التوصيل أو الإنجاز.',
        ]);

        $eligibility = ListingFeedback::eligibility($listing, $request->user());
        if (! $eligibility['can']) {
            return response()->json([
                'message' => $eligibility['reason'] === 'owner'
                    ? 'لا يمكنك تقييم إعلانك.'
                    : 'يمكن التقييم بعد استلام الطلب أو التواصل مع البائع بخصوص هذا الإعلان.',
            ], 403);
        }

        ListingFeedback::query()->updateOrCreate(
            ['product_id' => $listing->id, 'user_id' => $request->user()->id],
            [
                'matches_photos' => $validated['matches_photos'],
                'delivery_speed' => $validated['delivery_speed'],
                'comment' => isset($validated['comment']) ? (trim($validated['comment']) ?: null) : null,
                'verified_purchase' => $eligibility['verified'],
                'purchase_id' => $eligibility['purchase_id'],
            ],
        );

        return response()->json([
            'message' => 'شكراً، تم حفظ تقييمك.',
            'data' => $listing->qualitySummary(),
        ]);
    }
}
