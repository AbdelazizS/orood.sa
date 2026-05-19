<?php

namespace Tests\Unit;

use App\Models\Category;
use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Models\CategorySchemaSection;
use App\Services\Listings\ListingSchemaValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingSchemaValidatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_validate_ignores_hidden_attribute_keys_and_normalizes_switch_strings(): void
    {
        $category = Category::factory()->create(['dynamic_schema_enabled' => true]);

        $schema = CategoryListingSchema::create([
            'category_id' => $category->id,
            'listing_type' => 'offer',
            'version' => 1,
            'status' => CategoryListingSchema::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        $section = CategorySchemaSection::create([
            'schema_id' => $schema->id,
            'section_key' => 'specs',
            'title_ar' => 'مواصفات',
            'sort_order' => 0,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'purpose',
            'field_type' => 'select',
            'label_ar' => 'الغرض',
            'required' => true,
            'options' => [
                ['value' => 'sale', 'label_ar' => 'للبيع'],
                ['value' => 'rent', 'label_ar' => 'للإيجار'],
            ],
            'sort_order' => 0,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'property_type',
            'field_type' => 'select',
            'label_ar' => 'النوع',
            'required' => true,
            'options' => [
                ['value' => 'villa', 'label_ar' => 'فيلا'],
            ],
            'sort_order' => 1,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'area_sqm',
            'field_type' => 'number',
            'label_ar' => 'المساحة',
            'required' => true,
            'visible_when' => ['property_type' => ['villa', 'apartment']],
            'sort_order' => 2,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'land_width_m',
            'field_type' => 'number',
            'label_ar' => 'عرض الأرض',
            'required' => true,
            'visible_when' => ['property_type' => ['land']],
            'sort_order' => 3,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'parking',
            'field_type' => 'switch',
            'label_ar' => 'موقف',
            'required' => false,
            'sort_order' => 4,
        ]);

        $schema->load('fields');

        $validator = app(ListingSchemaValidator::class);

        $validated = $validator->validate($schema, [
            'purpose' => 'sale',
            'property_type' => 'villa',
            'area_sqm' => '42',
            'land_width_m' => 10,
            'parking' => 'true',
            'bedrooms' => 3,
        ]);

        $this->assertSame('sale', $validated['purpose']);
        $this->assertSame('villa', $validated['property_type']);
        $this->assertSame(42, $validated['area_sqm']);
        $this->assertTrue($validated['parking']);
        $this->assertArrayNotHasKey('land_width_m', $validated);
        $this->assertArrayNotHasKey('bedrooms', $validated);
    }
}
