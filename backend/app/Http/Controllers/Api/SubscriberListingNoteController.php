<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ListingFollowUpNote;
use App\Models\Notification;
use App\Models\SubscriberListing;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Private follow-up notes under a bought listing.
 * Shared by the subscriber and Arooth staff/admin; nobody else can read or write them.
 */
class SubscriberListingNoteController extends Controller
{
    public function index(Request $request, SubscriberListing $subscriberListing): JsonResponse
    {
        $this->authorizeNotes($request->user(), $subscriberListing);

        // Opening the thread = reading it (clears the red badge for this viewer).
        $subscriberListing->markReadBy((int) $request->user()->id);

        $notes = $subscriberListing->notes()
            ->with('author:id,name,role')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $notes->map(fn (ListingFollowUpNote $n) => $this->present($n, $request->user())),
        ]);
    }

    public function store(Request $request, SubscriberListing $subscriberListing): JsonResponse
    {
        $user = $request->user();
        $this->authorizeNotes($user, $subscriberListing);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $note = $subscriberListing->notes()->create([
            'author_id' => $user->id,
            'body' => trim($validated['body']),
        ]);

        $subscriberListing->update([
            'last_note_at' => $note->created_at,
            'last_note_by' => $user->id,
        ]);
        $subscriberListing->markReadBy((int) $user->id);

        // Staff wrote → tell the subscriber. (The subscriber's own notes surface in the admin list order.)
        if ((int) $user->id !== (int) $subscriberListing->subscriber_id) {
            $product = $subscriberListing->product;
            Notification::create([
                'user_id' => $subscriberListing->subscriber_id,
                'type' => 'subscriber_listing_note',
                'title' => 'متابعة جديدة على عقارك',
                'body' => 'كتب فريق عروض ملاحظة على «'.($product?->title ?? 'العقار').'».',
                'data' => [
                    'product_id' => $subscriberListing->product_id,
                    'subscriber_listing_id' => $subscriberListing->id,
                    'actions' => [
                        ['label' => 'عرض المتابعة', 'href' => '/subscriber/listings/'.$subscriberListing->product_id, 'intent' => 'open_listing'],
                    ],
                ],
            ]);
        }

        return response()->json(['data' => $this->present($note->load('author:id,name,role'), $user)], 201);
    }

    private function authorizeNotes(?User $user, SubscriberListing $subscriberListing): void
    {
        if (! $subscriberListing->notesVisibleTo($user)) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ListingFollowUpNote $note, User $viewer): array
    {
        $role = (string) ($note->author?->role ?? '');

        return [
            'id' => $note->id,
            'body' => $note->body,
            'created_at' => $note->created_at,
            'is_mine' => (int) $note->author_id === (int) $viewer->id,
            'author' => [
                'id' => $note->author?->id,
                'name' => $note->author?->name,
                // subscriber | admin | staff — drives the badge in the thread.
                'kind' => match (true) {
                    $role === UserRole::SUBSCRIBER->value => 'subscriber',
                    in_array($role, [UserRole::ADMIN->value, UserRole::SUPERADMIN->value], true) => 'admin',
                    default => 'staff',
                },
            ],
        ];
    }
}
