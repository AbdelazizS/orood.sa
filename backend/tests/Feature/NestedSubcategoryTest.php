<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Subcategory;
use App\Models\User;
use Database\Seeders\CategoryListingSchemaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class NestedSubcategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }

    public function test_admin_can_create_nested_subcategory_tree(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $this->issueApiToken($admin);
        $category = Category::factory()->create();

        $root = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/categories/{$category->id}/subcategories", [
                'name' => 'أراضي',
            ])
            ->assertCreated()
            ->json('data');

        $child = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/categories/{$category->id}/subcategories", [
                'name' => 'أراضي تجارية',
                'parent_id' => $root['id'],
            ])
            ->assertCreated()
            ->json('data');

        $leaf = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/categories/{$category->id}/subcategories", [
                'name' => 'قطعة A',
                'parent_id' => $child['id'],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertDatabaseHas('subcategories', [
            'id' => $leaf['id'],
            'parent_id' => $child['id'],
            'category_id' => $category->id,
        ]);

        $list = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/categories')
            ->assertOk()
            ->json('data');

        $categoryPayload = collect($list)->firstWhere('id', $category->id);
        $this->assertNotNull($categoryPayload);
        $this->assertSame($root['id'], $categoryPayload['subcategories'][0]['id']);
        $this->assertSame($child['id'], $categoryPayload['subcategories'][0]['children'][0]['id']);
    }

    public function test_cannot_delete_subcategory_with_children(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $this->issueApiToken($admin);
        $category = Category::factory()->create();
        $parent = Subcategory::factory()->create(['category_id' => $category->id, 'parent_id' => null]);
        $child = Subcategory::factory()->create(['category_id' => $category->id, 'parent_id' => $parent->id]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/v1/admin/categories/{$category->id}/subcategories/{$parent->id}")
            ->assertStatus(422)
            ->assertJson(['message' => 'Cannot delete subcategory with children']);

        $this->assertDatabaseHas('subcategories', ['id' => $parent->id]);
        $this->assertDatabaseHas('subcategories', ['id' => $child->id]);
    }

    public function test_publish_listing_requires_leaf_subcategory(): void
    {
        $category = Category::factory()->create(['dynamic_schema_enabled' => true]);
        $this->seed(CategoryListingSchemaSeeder::class);

        $parent = Subcategory::factory()->create(['category_id' => $category->id, 'parent_id' => null]);
        $leaf = Subcategory::factory()->create(['category_id' => $category->id, 'parent_id' => $parent->id]);

        $seller = User::factory()->create();
        $token = $this->issueApiToken($seller);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'عرض على فرع غير ورقة',
                'description' => 'وصف تفصيلي للعرض على فرع يحتوي فروعاً فرعية.',
                'category_id' => $category->id,
                'subcategory_id' => $parent->id,
                'image_urls' => ['https://example.com/a.jpg'],
                'contact_phone' => false,
                'contact_messages' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['subcategory_id']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'عرض على ورقة',
                'description' => 'وصف تفصيلي للعرض على فرع ورقة بدون أبناء.',
                'category_id' => $category->id,
                'subcategory_id' => $leaf->id,
                'image_urls' => ['https://example.com/a.jpg'],
                'contact_phone' => false,
                'contact_messages' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.subcategory.id', $leaf->id);
    }

    public function test_public_categories_returns_nested_subcategories(): void
    {
        $category = Category::factory()->create(['is_active' => true]);
        $root = Subcategory::factory()->create([
            'category_id' => $category->id,
            'parent_id' => null,
            'is_active' => true,
        ]);
        $child = Subcategory::factory()->create([
            'category_id' => $category->id,
            'parent_id' => $root->id,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/categories')
            ->assertOk();

        $payload = collect($response->json())
            ->firstWhere('id', $category->id);

        $this->assertNotNull($payload);
        $this->assertSame($root->id, $payload['subcategories'][0]['id']);
        $this->assertSame($child->id, $payload['subcategories'][0]['children'][0]['id']);
    }

    public function test_subcategories_endpoint_filters_by_parent_id(): void
    {
        $category = Category::factory()->create(['is_active' => true]);
        $root = Subcategory::factory()->create([
            'category_id' => $category->id,
            'parent_id' => null,
            'is_active' => true,
        ]);
        Subcategory::factory()->create([
            'category_id' => $category->id,
            'parent_id' => $root->id,
            'is_active' => true,
        ]);

        $roots = $this->getJson("/api/v1/categories/{$category->id}/subcategories")
            ->assertOk()
            ->json();

        $this->assertCount(1, $roots);

        $children = $this->getJson("/api/v1/categories/{$category->id}/subcategories?parent_id={$root->id}")
            ->assertOk()
            ->json();

        $this->assertCount(1, $children);
    }
}
