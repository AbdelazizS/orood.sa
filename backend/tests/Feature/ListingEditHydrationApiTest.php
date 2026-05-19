<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Models\CategorySchemaSection;
use App\Models\ListingAttributeValue;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingEditHydrationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_show_merges_legacy_real_estate_into_listing_attributes(): void
    {
        $seller = User::factory()->create();
        $category = Category::factory()->create(['slug' => 'real-estate', 'dynamic_schema_enabled' => true]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'status' => 'published',
        ]);

        $product->realEstateDetail()->create([
            'purpose' => 'sale',
            'property_type' => 'apartment',
            'area_sqm' => 120,
            'bedrooms' => 3,
            'amenities' => ['parking', 'garden', 'internet'],
        ]);

        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/listings/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.listing_attributes.purpose', 'sale')
            ->assertJsonPath('data.listing_attributes.property_type', 'apartment')
            ->assertJsonPath('data.listing_attributes.area_sqm', 120)
            ->assertJsonPath('data.listing_attributes.parking', true)
            ->assertJsonPath('data.listing_attributes.garden', true)
            ->assertJsonPath('data.listing_attributes.internet', true);
    }

    public function test_listing_show_includes_flat_attributes_when_sections_exist(): void
    {
        $seller = User::factory()->create();
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
            'section_key' => 'features',
            'title_ar' => 'المميزات',
            'sort_order' => 0,
        ]);

        $parkingField = CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'parking',
            'field_type' => 'switch',
            'label_ar' => 'موقف سيارة',
            'required' => false,
            'sort_order' => 0,
        ]);

        $gardenField = CategorySchemaField::create([
            'schema_id' => $schema->id,
            'section_id' => $section->id,
            'field_key' => 'garden',
            'field_type' => 'switch',
            'label_ar' => 'حديقة',
            'required' => false,
            'sort_order' => 1,
        ]);

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'status' => 'published',
            'free_shipping' => true,
            'contact_preferences' => ['phone' => true, 'messages' => true, 'phone_number' => '0512345678'],
            'shipping_details' => ['free_shipping' => true, 'free_return' => false, 'view_at_client' => true],
            'view_at_location' => true,
        ]);

        ListingAttributeValue::create([
            'product_id' => $product->id,
            'category_schema_field_id' => $parkingField->id,
            'value_json' => true,
        ]);

        ListingAttributeValue::create([
            'product_id' => $product->id,
            'category_schema_field_id' => $gardenField->id,
            'value_json' => true,
        ]);

        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/listings/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.listing_attributes.parking', true)
            ->assertJsonPath('data.listing_attributes.garden', true)
            ->assertJsonPath('data.free_shipping', true)
            ->assertJsonPath('data.view_at_location', true)
            ->assertJsonCount(1, 'data.listing_attribute_sections');
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'listing-edit-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
