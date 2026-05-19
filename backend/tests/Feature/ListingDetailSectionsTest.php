<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Models\CategorySchemaSection;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingDetailSectionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_show_virtual_sections_localize_legacy_real_estate_attributes(): void
    {
        $seller = User::factory()->create();
        $category = Category::factory()->create(['slug' => 'real-estate', 'dynamic_schema_enabled' => true]);

        $schema = CategoryListingSchema::create([
            'category_id' => $category->id,
            'listing_type' => 'offer',
            'version' => 1,
            'status' => CategoryListingSchema::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        $specsSection = CategorySchemaSection::create([
            'schema_id' => $schema->id,
            'section_key' => 'property_specs',
            'title_ar' => 'مواصفات العقار',
            'sort_order' => 0,
        ]);

        $featuresSection = CategorySchemaSection::create([
            'schema_id' => $schema->id,
            'section_key' => 'features',
            'title_ar' => 'المميزات',
            'sort_order' => 1,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $specsSection->id,
            'field_key' => 'purpose',
            'field_type' => 'select',
            'label_ar' => 'الغرض',
            'required' => true,
            'options' => [
                ['value' => 'sale', 'label_ar' => 'للبيع', 'label_en' => 'For sale'],
            ],
            'sort_order' => 0,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $specsSection->id,
            'field_key' => 'property_type',
            'field_type' => 'select',
            'label_ar' => 'نوع العقار',
            'required' => true,
            'options' => [
                ['value' => 'villa', 'label_ar' => 'فيلا', 'label_en' => 'Villa'],
            ],
            'sort_order' => 1,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $specsSection->id,
            'field_key' => 'area_sqm',
            'field_type' => 'number',
            'label_ar' => 'المساحة',
            'required' => true,
            'visible_when' => ['property_type' => ['villa', 'apartment']],
            'sort_order' => 2,
        ]);

        CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $featuresSection->id,
            'field_key' => 'parking',
            'field_type' => 'switch',
            'label_ar' => 'موقف سيارة',
            'config_json' => ['icon' => 'Car'],
            'sort_order' => 0,
        ]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'status' => 'published',
        ]);

        $product->realEstateDetail()->create([
            'purpose' => 'sale',
            'property_type' => 'villa',
            'area_sqm' => 42,
            'amenities' => ['parking', 'garden'],
        ]);

        $token = $this->issueApiToken($seller);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->withHeader('Accept-Language', 'ar')
            ->getJson("/api/v1/listings/{$product->id}")
            ->assertOk();

        $sections = $response->json('data.listing_attribute_sections');
        $this->assertNotEmpty($sections);

        $allFields = collect($sections)->flatMap(fn ($s) => $s['fields'] ?? []);
        $purpose = $allFields->firstWhere('field_key', 'purpose');
        $this->assertSame('للبيع', $purpose['display_value'] ?? null);

        $propertyType = $allFields->firstWhere('field_key', 'property_type');
        $this->assertSame('فيلا', $propertyType['display_value'] ?? null);

        $parking = $allFields->firstWhere('field_key', 'parking');
        $this->assertNotNull($parking);
        $this->assertSame('', $parking['display_value'] ?? null);
        $this->assertSame('features', collect($sections)->first(fn ($s) => collect($s['fields'] ?? [])->contains('field_key', 'parking'))['key'] ?? null);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'listing-sections-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
