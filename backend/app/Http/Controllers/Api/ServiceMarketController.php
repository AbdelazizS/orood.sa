<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use App\Models\ServiceProvider;
use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceMarketController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        $locale = $request->header('Accept-Language');
        $rows = ServiceCategory::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ServiceCategory $cat) => [
                'id' => $cat->id,
                'slug' => $cat->slug,
                'name' => $cat->localizedName($locale),
                'icon' => $cat->icon,
            ]);

        return response()->json(['data' => $rows]);
    }

    public function providers(Request $request): JsonResponse
    {
        $query = ServiceProvider::query()
            ->with(['user:id,name,image,avatar', 'category'])
            ->where('status', ServiceProvider::STATUS_ACTIVE)
            ->where('is_available', true);

        if ($request->filled('service_type')) {
            $query->where('service_type', (string) $request->query('service_type'));
        }

        if ($request->integer('category_id') > 0) {
            $query->where('service_category_id', $request->integer('category_id'));
        }

        if ($request->filled('city')) {
            $city = (string) $request->query('city');
            $query->where(function ($q) use ($city) {
                $q->whereJsonContains('cities', $city)
                    ->orWhere('cities', 'like', '%"'.$city.'"%');
            });
        }

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $minRating = $request->float('min_rating');
        if ($minRating > 0) {
            $query->where('rating_avg', '>=', $minRating);
        }

        $sort = (string) $request->query('sort', 'rating');
        match ($sort) {
            'price_asc' => $query->orderBy('price_from'),
            'price_desc' => $query->orderByDesc('price_from'),
            'newest' => $query->orderByDesc('created_at'),
            default => $query->orderByDesc('rating_avg')->orderByDesc('rating_count'),
        };

        $providers = $query->paginate((int) $request->query('per_page', 20));

        return response()->json([
            'data' => collect($providers->items())->map(fn (ServiceProvider $p) => $this->providerPayload($p, $request))->values(),
            'meta' => [
                'current_page' => $providers->currentPage(),
                'last_page' => $providers->lastPage(),
                'per_page' => $providers->perPage(),
                'total' => $providers->total(),
            ],
        ]);
    }

    public function show(Request $request, ServiceProvider $provider): JsonResponse
    {
        if ($provider->status !== ServiceProvider::STATUS_ACTIVE) {
            return response()->json(['message' => __('Not found')], 404);
        }

        $provider->load(['user:id,name,image,avatar', 'category']);

        return response()->json(['data' => $this->providerPayload($provider, $request, true)]);
    }

    public function storeProvider(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'service_category_id' => ['nullable', 'integer', 'exists:service_categories,id'],
            'service_type' => ['required', 'string', 'max:64'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'cities' => ['nullable', 'array'],
            'cities.*' => ['string', 'max:120'],
            'pricing_type' => ['nullable', 'string', 'max:32'],
            'price_from' => ['nullable', 'numeric', 'min:0'],
            'price_to' => ['nullable', 'numeric', 'min:0'],
            'vehicle_type' => ['nullable', 'string', 'max:120'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'is_available' => ['nullable', 'boolean'],
        ]);

        $provider = ServiceProvider::updateOrCreate(
            ['user_id' => $user->id],
            [
                ...$validated,
                'status' => ServiceProvider::STATUS_ACTIVE,
            ]
        );

        $provider->load(['user:id,name,image,avatar', 'category']);

        return response()->json([
            'message' => __('services.provider_saved'),
            'data' => $this->providerPayload($provider, $request, true),
        ], 201);
    }

    public function storeRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'service_provider_id' => ['required', 'integer', 'exists:service_providers,id'],
            'message' => ['nullable', 'string', 'max:3000'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'address_text' => ['nullable', 'string', 'max:500'],
            'scheduled_at' => ['nullable', 'date', 'after:now'],
        ]);

        $provider = ServiceProvider::query()->findOrFail($validated['service_provider_id']);
        if (! $provider->is_available) {
            return response()->json(['message' => __('services.provider_unavailable')], 422);
        }

        $row = ServiceRequest::create([
            'service_provider_id' => $provider->id,
            'user_id' => $request->user()->id,
            'status' => ServiceRequest::STATUS_NEW,
            'message' => $validated['message'] ?? null,
            'city_id' => $validated['city_id'] ?? null,
            'address_text' => $validated['address_text'] ?? null,
            'scheduled_at' => $validated['scheduled_at'] ?? null,
        ]);

        return response()->json([
            'message' => __('services.request_created'),
            'data' => $this->requestPayload($row->load(['provider.user', 'city'])),
        ], 201);
    }

    public function myRequests(Request $request): JsonResponse
    {
        $rows = ServiceRequest::query()
            ->where('user_id', $request->user()->id)
            ->with(['provider.user', 'city'])
            ->latest('id')
            ->paginate(20);

        return response()->json([
            'data' => collect($rows->items())->map(fn (ServiceRequest $r) => $this->requestPayload($r))->values(),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'total' => $rows->total(),
            ],
        ]);
    }

    public function providerDashboard(Request $request): JsonResponse
    {
        $provider = ServiceProvider::query()
            ->where('user_id', $request->user()->id)
            ->with(['category'])
            ->first();

        if (! $provider) {
            return response()->json(['data' => null]);
        }

        $requests = ServiceRequest::query()
            ->where('service_provider_id', $provider->id)
            ->with(['user:id,name,image,avatar', 'city'])
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (ServiceRequest $r) => $this->requestPayload($r));

        return response()->json([
            'data' => [
                'provider' => $this->providerPayload($provider, $request, true),
                'requests' => $requests,
                'stats' => [
                    'open_requests' => ServiceRequest::query()
                        ->where('service_provider_id', $provider->id)
                        ->whereIn('status', [ServiceRequest::STATUS_NEW, ServiceRequest::STATUS_IN_PROGRESS, ServiceRequest::STATUS_EN_ROUTE])
                        ->count(),
                    'completed' => ServiceRequest::query()
                        ->where('service_provider_id', $provider->id)
                        ->where('status', ServiceRequest::STATUS_COMPLETED)
                        ->count(),
                ],
            ],
        ]);
    }

    public function updateRequestStatus(Request $request, ServiceRequest $serviceRequest): JsonResponse
    {
        $provider = ServiceProvider::query()->where('user_id', $request->user()->id)->first();
        if (! $provider || (int) $serviceRequest->service_provider_id !== (int) $provider->id) {
            return response()->json(['message' => __('auth.invalid_credentials')], 403);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                ServiceRequest::STATUS_NEW,
                ServiceRequest::STATUS_IN_PROGRESS,
                ServiceRequest::STATUS_EN_ROUTE,
                ServiceRequest::STATUS_COMPLETED,
                ServiceRequest::STATUS_CANCELLED,
            ])],
        ]);

        $serviceRequest->update(['status' => $validated['status']]);

        return response()->json([
            'message' => __('services.request_updated'),
            'data' => $this->requestPayload($serviceRequest->fresh()->load(['provider.user', 'user', 'city'])),
        ]);
    }

    private function providerPayload(ServiceProvider $provider, Request $request, bool $detailed = false): array
    {
        $locale = $request->header('Accept-Language');
        $payload = [
            'id' => $provider->id,
            'service_type' => $provider->service_type,
            'title' => $provider->title,
            'description' => $detailed ? $provider->description : ($provider->description ? \Illuminate\Support\Str::limit((string) $provider->description, 160) : null),
            'cities' => $provider->cities ?? [],
            'pricing_type' => $provider->pricing_type,
            'price_from' => $provider->price_from,
            'price_to' => $provider->price_to,
            'rating_avg' => (float) $provider->rating_avg,
            'rating_count' => (int) $provider->rating_count,
            'is_available' => (bool) $provider->is_available,
            'vehicle_type' => $provider->vehicle_type,
            'latitude' => $provider->latitude,
            'longitude' => $provider->longitude,
            'category' => $provider->category ? [
                'id' => $provider->category->id,
                'slug' => $provider->category->slug,
                'name' => $provider->category->localizedName($locale),
            ] : null,
            'user' => [
                'id' => $provider->user?->id,
                'name' => $provider->user?->name,
                'avatar' => $provider->user?->avatar ?: $provider->user?->image,
            ],
        ];

        return $payload;
    }

    private function requestPayload(ServiceRequest $row): array
    {
        return [
            'id' => $row->id,
            'status' => $row->status,
            'message' => $row->message,
            'address_text' => $row->address_text,
            'scheduled_at' => $row->scheduled_at?->toIso8601String(),
            'created_at' => $row->created_at?->toIso8601String(),
            'city' => $row->city ? ['id' => $row->city->id, 'name' => $row->city->name] : null,
            'provider' => $row->relationLoaded('provider') && $row->provider
                ? ['id' => $row->provider->id, 'title' => $row->provider->title]
                : null,
            'user' => $row->relationLoaded('user') && $row->user
                ? ['id' => $row->user->id, 'name' => $row->user->name]
                : null,
        ];
    }
}
