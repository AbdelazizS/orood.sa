<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    /**
     * Show profile by username (for /profile/:username routes).
     */
    public function showByUsername(string $username): JsonResponse
    {
        $user = User::where('username', $username)->orWhere('name', $username)->firstOrFail();
        return $this->show($user);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['reviewsReceived.reviewer', 'reviewsReceived.product', 'city.region']);
        $listings = $user->products()
            ->with(['category', 'subcategory', 'region', 'city', 'seller'])
            ->published()
            ->approved()
            ->orderByDesc('published_at')
            ->limit(24)
            ->get();

        $soldItems = $user->products()
            ->published()
            ->approved()
            ->get()
            ->sum(fn ($p) => (int) data_get($p->stats, 'purchases', 0));

        $locale = request()->header('Accept-Language', 'ar');

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
                'cover_photo_url' => $user->cover_photo_url,
                'logo_url' => $user->logo_url ?? $user->avatar_url,
                'financial_guarantee' => (float) ($user->financial_guarantee ?? 0),
                'verification_type' => $user->verification_type,
                'verification_level' => $user->verification_level ?? (($user->email_verified_at ? 'email' : 'unverified')),
                'role' => $user->role,
                'phone' => $user->phone,
                'is_verified' => (bool) $user->is_verified,
                'email_verified' => (bool) $user->email_verified_at,
                'city' => $user->city ? [
                    'id' => $user->city->id,
                    'name' => $user->city->getLocalizedName($locale),
                    'region' => $user->city->region ? [
                        'id' => $user->city->region->id,
                        'name' => $user->city->region->getLocalizedName($locale),
                    ] : null,
                ] : null,
                'location_lat' => $user->location_lat !== null ? (float) $user->location_lat : null,
                'location_lng' => $user->location_lng !== null ? (float) $user->location_lng : null,
                'location_address' => $user->location_address,
                'last_seen' => 'Online',
                'listings_count' => $user->products()->published()->approved()->count(),
                'sold_items' => $soldItems,
                'active_listings' => $user->products()->published()->approved()->count(),
                'reviews' => $user->reviewsReceived->map(fn ($r) => [
                    'id' => $r->id,
                    'rating' => $r->rating,
                    'comment' => $r->comment,
                    'created_at' => $r->created_at,
                    'reviewer' => ['id' => $r->reviewer?->id, 'name' => $r->reviewer?->name],
                    'product' => $r->product ? ['id' => $r->product->id, 'title' => $r->product->title] : null,
                ]),
                'reviews_avg' => round($user->reviewsReceived->avg('rating') ?? 0, 1),
                'reviews_count' => $user->reviewsReceived->count(),
                'listings' => ProductResource::collection($listings),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'avatar_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'cover_photo_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'logo_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'city_id' => ['sometimes', 'nullable', 'integer', 'exists:cities,id'],
            'location_lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'location_lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'location_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'financial_guarantee' => ['sometimes', 'numeric', 'min:0'],
        ]);

        if (array_key_exists('avatar_url', $validated) && $validated['avatar_url'] === null && $user->avatar_url) {
            $oldPath = str_replace('/storage/', 'public/', $user->avatar_url);
            Storage::delete($oldPath);
        }
        if (array_key_exists('cover_photo_url', $validated) && $validated['cover_photo_url'] === null && $user->cover_photo_url) {
            $oldPath = str_replace('/storage/', 'public/', $user->cover_photo_url);
            Storage::delete($oldPath);
        }

        $user->update($validated);

        return response()->json(['data' => $user->fresh()]);
    }

    /**
     * Update avatar (multipart upload).
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $name = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('uploads/avatars', $name, 'public');
        $avatarUrl = '/storage/' . $path;

        if ($user->avatar_url) {
            $oldPath = str_replace('/storage/', 'public/', $user->avatar_url);
            Storage::delete($oldPath);
        }

        $user->update(['avatar_url' => $avatarUrl]);

        return response()->json(['data' => ['avatar_url' => $avatarUrl]]);
    }

    /**
     * Update cover (multipart upload).
     */
    public function updateCover(Request $request): JsonResponse
    {
        $request->validate([
            'cover' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $file = $request->file('cover');
        $name = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('uploads/covers', $name, 'public');
        $coverUrl = '/storage/' . $path;

        if ($user->cover_photo_url) {
            $oldPath = str_replace('/storage/', 'public/', $user->cover_photo_url);
            Storage::delete($oldPath);
        }

        $user->update(['cover_photo_url' => $coverUrl]);

        return response()->json(['data' => ['cover_url' => $coverUrl]]);
    }
}
