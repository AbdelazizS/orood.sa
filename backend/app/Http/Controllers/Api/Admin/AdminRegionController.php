<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Region;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminRegionController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Region::with('cities')->orderBy('name');
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($qry) use ($search) {
                $qry->where('name', 'like', "%{$search}%")
                    ->orWhereHas('cities', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }
        $regions = $query->paginate($request->get('per_page', 15));
        return response()->json([
            'data' => $regions->items(),
            'meta' => [
                'current_page' => $regions->currentPage(),
                'last_page' => $regions->lastPage(),
                'per_page' => $regions->perPage(),
                'total' => $regions->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $validated['slug'] = Str::slug($validated['name']) . '-' . substr(uniqid(), -4);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $region = Region::create($validated);
        $this->audit->log('region.created', $region, null, $validated);

        return response()->json(['data' => $region], 201);
    }

    public function update(Request $request, Region $region): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        }

        $oldValues = $region->getOriginal();
        $region->update($validated);
        $this->audit->log('region.updated', $region, $oldValues, $validated);

        return response()->json(['data' => $region->fresh()]);
    }

    public function destroy(Region $region): JsonResponse
    {
        $this->audit->log('region.deleted', $region, $region->toArray());
        $region->delete();
        return response()->json(['message' => 'Region deleted']);
    }

    public function storeCity(Request $request, Region $region): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $validated['region_id'] = $region->id;
        $validated['slug'] = Str::slug($validated['name']) . '-' . substr(uniqid(), -4);
        $validated['is_active'] = $validated['is_active'] ?? true;

        $city = City::create($validated);
        $this->audit->log('city.created', $city, null, $validated);

        return response()->json(['data' => $city], 201);
    }

    public function updateCity(Request $request, Region $region, City $city): JsonResponse
    {
        if ($city->region_id !== $region->id) {
            return response()->json(['message' => 'City does not belong to region'], 422);
        }
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        }

        $oldValues = $city->getOriginal();
        $city->update($validated);
        $this->audit->log('city.updated', $city, $oldValues, $validated);

        return response()->json(['data' => $city->fresh()]);
    }

    public function destroyCity(Region $region, City $city): JsonResponse
    {
        if ($city->region_id !== $region->id) {
            return response()->json(['message' => 'City does not belong to region'], 422);
        }
        $this->audit->log('city.deleted', $city, $city->toArray());
        $city->delete();
        return response()->json(['message' => 'City deleted']);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:regions,id'],
            'is_active' => ['required', 'boolean'],
        ]);
        Region::whereIn('id', $validated['ids'])->update(['is_active' => $validated['is_active']]);
        return response()->json(['message' => 'Regions updated', 'count' => count($validated['ids'])]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:regions,id'],
        ]);
        $count = Region::whereIn('id', $validated['ids'])->delete();
        return response()->json(['message' => 'Regions deleted', 'count' => $count]);
    }
}
