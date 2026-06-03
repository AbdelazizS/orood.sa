<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Subcategory;
use App\Models\User;
use Database\Seeders\CategoryListingSchemaSeeder;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubcategoryOtherTest extends TestCase
{
    use RefreshDatabase;

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }

    public function test_store_with_subcategory_other_without_subcategory_id(): void
    {
        $category = Category::factory()->create();
        Subcategory::factory()->create(['category_id' => $category->id]);
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'معدات ثقيلة',
                'description' => 'وصف تفصيلي للمعدات المعروضة للبيع.',
                'category_id' => $category->id,
                'subcategory_other' => 'معدات ثقيلة',
                'image_urls' => ['https://example.com/a.jpg'],
                'contact_phone' => false,
                'contact_messages' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.subcategory_other', 'معدات ثقيلة');

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'subcategory_id' => null,
            'subcategory_other' => 'معدات ثقيلة',
        ]);
    }

    public function test_other_without_text_returns_validation_error(): void
    {
        $category = Category::factory()->create();
        Subcategory::factory()->create(['category_id' => $category->id]);
        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'عرض بدون فرع',
                'description' => 'وصف تفصيلي للعرض بدون اختيار فرع.',
                'category_id' => $category->id,
                'image_urls' => ['https://example.com/a.jpg'],
                'contact_phone' => false,
                'contact_messages' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['subcategory_other']);
    }

    public function test_real_estate_subcategory_injects_property_type_from_branch(): void
    {
        $this->seed(CategorySeeder::class);
        $this->seed(CategoryListingSchemaSeeder::class);

        $category = Category::query()->where('slug', 'real-estate')->firstOrFail();
        $subcategory = Subcategory::factory()->create([
            'category_id' => $category->id,
            'slug' => 'real-estate-farm-test',
            'listing_property_type' => 'farm',
        ]);

        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'مزرعة للبيع',
                'description' => 'مزرعة في موقع مميز مع مساحة واسعة.',
                'category_id' => $category->id,
                'subcategory_id' => $subcategory->id,
                'listing_attributes' => [
                    'purpose' => 'sale',
                    'land_width_m' => 40,
                    'land_length_m' => 60,
                ],
                'location_lat' => 24.71,
                'location_lng' => 46.67,
                'image_urls' => ['https://example.com/farm.jpg'],
                'contact_phone' => false,
                'contact_messages' => true,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('product_real_estate_details', [
            'property_type' => 'farm',
        ]);
    }
}
