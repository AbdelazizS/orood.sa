<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryListingSchema;
use App\Models\CategoryListingPolicy;
use App\Models\CategorySchemaField;
use App\Models\CategorySchemaSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingSchemaApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_schema_returns_published_fields(): void
    {
        $category = Category::factory()->create([
            'slug' => 'test-cat',
            'dynamic_schema_enabled' => true,
        ]);

        $schema = CategoryListingSchema::create([
            'category_id' => $category->id,
            'listing_type' => 'offer',
            'version' => 1,
            'status' => CategoryListingSchema::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        CategoryListingPolicy::create([
            'schema_id' => $schema->id,
            'location_policy' => ['mode' => 'region_only', 'required' => true],
        ]);

        $section = CategorySchemaSection::create([
            'schema_id' => $schema->id,
            'section_key' => 'details',
            'title_ar' => 'تفاصيل',
            'sort_order' => 0,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'brand',
            'field_type' => 'text',
            'label_ar' => 'الماركة',
            'required' => true,
            'sort_order' => 0,
        ]);

        $response = $this->getJson("/api/v1/categories/{$category->id}/listing-schema");

        $response->assertOk()
            ->assertJsonPath('dynamic_schema_enabled', true)
            ->assertJsonPath('data.fields.0.field_key', 'brand');
    }
}
