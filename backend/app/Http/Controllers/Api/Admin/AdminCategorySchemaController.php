<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryListingPolicy;
use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaAuditLog;
use App\Models\CategorySchemaField;
use App\Models\CategorySchemaSection;
use App\Models\ListingAgreement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCategorySchemaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CategoryListingSchema::query()
            ->with(['category', 'subcategory'])
            ->withCount(['sections', 'fields'])
            ->orderByDesc('updated_at');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('subcategory_id')) {
            $query->where('subcategory_id', $request->integer('subcategory_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 50)));

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'exists:subcategories,id'],
            'listing_type' => ['nullable', 'string', 'in:offer,request'],
        ]);

        $schema = CategoryListingSchema::create([
            'category_id' => $validated['category_id'],
            'subcategory_id' => $validated['subcategory_id'] ?? null,
            'listing_type' => $validated['listing_type'] ?? 'offer',
            'version' => 1,
            'status' => CategoryListingSchema::STATUS_DRAFT,
            'created_by' => $request->user()?->id,
        ]);

        CategoryListingPolicy::create([
            'schema_id' => $schema->id,
            'location_policy' => app(\App\Services\Listings\ListingSchemaService::class)->defaultPolicies()['location'],
            'price_policy' => app(\App\Services\Listings\ListingSchemaService::class)->defaultPolicies()['price'],
            'media_policy' => app(\App\Services\Listings\ListingSchemaService::class)->defaultPolicies()['media'],
            'communication_policy' => app(\App\Services\Listings\ListingSchemaService::class)->defaultPolicies()['communication'],
        ]);

        $this->audit($schema->id, 'created', $request->user()?->id, null);

        return response()->json(['data' => $schema->load(['policy', 'sections', 'fields'])], 201);
    }

    public function show(CategoryListingSchema $categorySchema): JsonResponse
    {
        return response()->json([
            'data' => $categorySchema->load(['sections', 'fields.fieldOptions', 'policy', 'agreements', 'category', 'subcategory']),
        ]);
    }

    public function update(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        if ($categorySchema->status === CategoryListingSchema::STATUS_PUBLISHED) {
            return response()->json(['message' => 'Published schemas are immutable. Clone to draft.'], 422);
        }

        $validated = $request->validate([
            'listing_type' => ['sometimes', 'string', 'in:offer,request'],
        ]);

        $categorySchema->update($validated);
        $this->audit($categorySchema->id, 'updated', $request->user()?->id, $validated);

        return response()->json(['data' => $categorySchema->fresh()->load(['sections', 'fields', 'policy', 'agreements'])]);
    }

    public function publish(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        DB::transaction(function () use ($categorySchema, $request) {
            CategoryListingSchema::query()
                ->where('category_id', $categorySchema->category_id)
                ->where('subcategory_id', $categorySchema->subcategory_id)
                ->where('listing_type', $categorySchema->listing_type)
                ->where('status', CategoryListingSchema::STATUS_PUBLISHED)
                ->where('id', '!=', $categorySchema->id)
                ->update(['status' => 'archived']);

            $categorySchema->update([
                'status' => CategoryListingSchema::STATUS_PUBLISHED,
                'published_at' => now(),
                'version' => $categorySchema->version + 1,
            ]);

            Category::query()
                ->where('id', $categorySchema->category_id)
                ->update(['dynamic_schema_enabled' => true]);

            $this->audit($categorySchema->id, 'published', $request->user()?->id, null);
        });

        return response()->json(['data' => $categorySchema->fresh()]);
    }

    public function clone(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        $categorySchema->load(['sections.fields', 'fields', 'policy', 'agreements']);

        $draft = DB::transaction(function () use ($categorySchema, $request) {
            $newSchema = CategoryListingSchema::create([
                'category_id' => $categorySchema->category_id,
                'subcategory_id' => $categorySchema->subcategory_id,
                'listing_type' => $categorySchema->listing_type,
                'version' => 1,
                'status' => CategoryListingSchema::STATUS_DRAFT,
                'created_by' => $request->user()?->id,
            ]);

            $policy = $categorySchema->policy;
            if ($policy) {
                CategoryListingPolicy::create([
                    'schema_id' => $newSchema->id,
                    'location_policy' => $policy->location_policy,
                    'price_policy' => $policy->price_policy,
                    'media_policy' => $policy->media_policy,
                    'communication_policy' => $policy->communication_policy,
                ]);
            }

            $sectionMap = [];
            foreach ($categorySchema->sections()->orderBy('sort_order')->get() as $section) {
                $copy = $newSchema->sections()->create([
                    'section_key' => $section->section_key,
                    'title_ar' => $section->title_ar,
                    'title_en' => $section->title_en,
                    'sort_order' => $section->sort_order,
                    'visible_when' => $section->visible_when,
                ]);
                $sectionMap[$section->id] = $copy->id;
            }

            foreach ($categorySchema->fields()->orderBy('sort_order')->get() as $field) {
                CategorySchemaField::create([
                    'schema_id' => $newSchema->id,
                    'section_id' => $sectionMap[$field->section_id] ?? null,
                    'field_key' => $field->field_key,
                    'field_type' => $field->field_type,
                    'label_ar' => $field->label_ar,
                    'label_en' => $field->label_en,
                    'placeholder_ar' => $field->placeholder_ar,
                    'placeholder_en' => $field->placeholder_en,
                    'help_ar' => $field->help_ar,
                    'help_en' => $field->help_en,
                    'required' => $field->required,
                    'validation_rules' => $field->validation_rules,
                    'options' => $field->options,
                    'visible_when' => $field->visible_when,
                    'config_json' => $field->config_json,
                    'filterable' => $field->filterable,
                    'show_on_card' => $field->show_on_card,
                    'sort_order' => $field->sort_order,
                ]);
            }

            foreach ($categorySchema->agreements as $agreement) {
                $newSchema->agreements()->create([
                    'category_id' => $newSchema->category_id,
                    'content_ar' => $agreement->content_ar,
                    'content_en' => $agreement->content_en,
                    'required' => $agreement->required,
                    'sort_order' => $agreement->sort_order,
                    'listing_type' => $agreement->listing_type,
                    'role' => $agreement->role,
                ]);
            }

            $this->audit($newSchema->id, 'cloned', $request->user()?->id, ['from_schema_id' => $categorySchema->id]);

            return $newSchema;
        });

        return response()->json(['data' => $draft->load(['sections', 'fields', 'policy', 'agreements'])], 201);
    }

    public function reorder(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        if ($response = $this->ensureDraft($categorySchema)) {
            return $response;
        }

        $validated = $request->validate([
            'sections' => ['nullable', 'array'],
            'sections.*.id' => ['required', 'integer', 'exists:category_schema_sections,id'],
            'sections.*.sort_order' => ['required', 'integer', 'min:0'],
            'fields' => ['nullable', 'array'],
            'fields.*.id' => ['required', 'integer', 'exists:category_schema_fields,id'],
            'fields.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($validated['sections'] ?? [] as $row) {
            CategorySchemaSection::query()
                ->where('schema_id', $categorySchema->id)
                ->where('id', $row['id'])
                ->update(['sort_order' => $row['sort_order']]);
        }

        foreach ($validated['fields'] ?? [] as $row) {
            CategorySchemaField::query()
                ->where('schema_id', $categorySchema->id)
                ->where('id', $row['id'])
                ->update(['sort_order' => $row['sort_order']]);
        }

        return response()->json(['data' => $categorySchema->fresh()->load(['sections', 'fields'])]);
    }

    public function duplicateSection(Request $request, CategoryListingSchema $categorySchema, CategorySchemaSection $section): JsonResponse
    {
        if ($response = $this->ensureDraft($categorySchema)) {
            return $response;
        }

        if ($section->schema_id !== $categorySchema->id) {
            return response()->json(['message' => 'Section not found on schema.'], 404);
        }

        $copy = DB::transaction(function () use ($categorySchema, $section, $request) {
            $suffix = '_copy_'.time();
            $newSection = $categorySchema->sections()->create([
                'section_key' => $section->section_key.$suffix,
                'title_ar' => $section->title_ar.' (نسخة)',
                'title_en' => ($section->title_en ?? $section->title_ar).' (copy)',
                'sort_order' => $section->sort_order + 1,
                'visible_when' => $section->visible_when,
            ]);

            foreach ($section->fields as $field) {
                CategorySchemaField::create([
                    'schema_id' => $categorySchema->id,
                    'section_id' => $newSection->id,
                    'field_key' => $field->field_key.$suffix,
                    'field_type' => $field->field_type,
                    'label_ar' => $field->label_ar,
                    'label_en' => $field->label_en,
                    'placeholder_ar' => $field->placeholder_ar,
                    'placeholder_en' => $field->placeholder_en,
                    'help_ar' => $field->help_ar,
                    'help_en' => $field->help_en,
                    'required' => $field->required,
                    'validation_rules' => $field->validation_rules,
                    'options' => $field->options,
                    'visible_when' => $field->visible_when,
                    'config_json' => $field->config_json,
                    'filterable' => $field->filterable,
                    'show_on_card' => $field->show_on_card,
                    'sort_order' => $field->sort_order,
                ]);
            }

            $this->audit($categorySchema->id, 'section_duplicated', $request->user()?->id, ['section_id' => $newSection->id]);

            return $newSection->load('fields');
        });

        return response()->json(['data' => $copy], 201);
    }

    public function storeSection(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        if ($response = $this->ensureDraft($categorySchema)) {
            return $response;
        }

        $validated = $request->validate([
            'section_key' => ['required', 'string', 'max:64'],
            'title_ar' => ['required', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['integer', 'min:0'],
            'visible_when' => ['nullable', 'array'],
        ]);

        $section = $categorySchema->sections()->create($validated);
        $this->audit($categorySchema->id, 'section_created', $request->user()?->id, $validated);

        return response()->json(['data' => $section], 201);
    }

    public function storeField(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        if ($response = $this->ensureDraft($categorySchema)) {
            return $response;
        }

        $validated = $request->validate([
            'section_id' => ['nullable', 'exists:category_schema_sections,id'],
            'field_key' => ['required', 'string', 'max:64'],
            'field_type' => ['required', 'string', 'max:32'],
            'label_ar' => ['required', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'placeholder_ar' => ['nullable', 'string', 'max:255'],
            'placeholder_en' => ['nullable', 'string', 'max:255'],
            'help_ar' => ['nullable', 'string', 'max:500'],
            'help_en' => ['nullable', 'string', 'max:500'],
            'required' => ['boolean'],
            'validation_rules' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'visible_when' => ['nullable', 'array'],
            'config_json' => ['nullable', 'array'],
            'filterable' => ['boolean'],
            'show_on_card' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $validated['schema_id'] = $categorySchema->id;
        $field = CategorySchemaField::create($validated);
        $this->audit($categorySchema->id, 'field_created', $request->user()?->id, ['field_key' => $field->field_key]);

        return response()->json(['data' => $field->load('fieldOptions')], 201);
    }

    public function updateField(Request $request, CategorySchemaField $categorySchemaField): JsonResponse
    {
        $schema = $categorySchemaField->schema;
        if ($schema && $schema->status === CategoryListingSchema::STATUS_PUBLISHED) {
            return response()->json(['message' => 'Published schemas are immutable. Clone to draft.'], 422);
        }

        $validated = $request->validate([
            'label_ar' => ['sometimes', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'placeholder_ar' => ['nullable', 'string', 'max:255'],
            'placeholder_en' => ['nullable', 'string', 'max:255'],
            'help_ar' => ['nullable', 'string', 'max:500'],
            'help_en' => ['nullable', 'string', 'max:500'],
            'required' => ['sometimes', 'boolean'],
            'validation_rules' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'visible_when' => ['nullable', 'array'],
            'config_json' => ['nullable', 'array'],
            'filterable' => ['sometimes', 'boolean'],
            'show_on_card' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'section_id' => ['nullable', 'exists:category_schema_sections,id'],
        ]);

        $categorySchemaField->update($validated);

        return response()->json(['data' => $categorySchemaField->fresh()]);
    }

    public function updatePolicy(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        $validated = $request->validate([
            'location_policy' => ['nullable', 'array'],
            'price_policy' => ['nullable', 'array'],
            'media_policy' => ['nullable', 'array'],
            'communication_policy' => ['nullable', 'array'],
        ]);

        $policy = $categorySchema->policy()->firstOrCreate(['schema_id' => $categorySchema->id]);
        $policy->update($validated);

        return response()->json(['data' => $policy->fresh()]);
    }

    public function storeAgreement(Request $request, CategoryListingSchema $categorySchema): JsonResponse
    {
        $validated = $request->validate([
            'content_ar' => ['required', 'string'],
            'content_en' => ['nullable', 'string'],
            'required' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
            'listing_type' => ['nullable', 'string'],
            'role' => ['nullable', 'string', 'max:32'],
        ]);

        $agreement = $categorySchema->agreements()->create(array_merge($validated, [
            'category_id' => $categorySchema->category_id,
        ]));

        return response()->json(['data' => $agreement], 201);
    }

    public function destroyField(CategorySchemaField $categorySchemaField): JsonResponse
    {
        $categorySchemaField->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function destroyAgreement(ListingAgreement $listingAgreement): JsonResponse
    {
        $listingAgreement->delete();

        return response()->json(['message' => 'Deleted']);
    }

    /**
     * @param  array<string, mixed>|null  $diff
     */
    private function ensureDraft(CategoryListingSchema $categorySchema): ?JsonResponse
    {
        if ($categorySchema->status === CategoryListingSchema::STATUS_PUBLISHED) {
            return response()->json(['message' => 'Published schemas are immutable. Clone to draft.'], 422);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>|null  $diff
     */
    private function audit(int $schemaId, string $action, ?int $actorId, ?array $diff): void
    {
        CategorySchemaAuditLog::create([
            'schema_id' => $schemaId,
            'action' => $action,
            'actor_id' => $actorId,
            'diff' => $diff,
        ]);
    }
}
