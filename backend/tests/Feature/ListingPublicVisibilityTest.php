<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingPublicVisibilityTest extends TestCase
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

    public function test_new_offer_is_listed_in_public_feed_when_auto_publish_on(): void
    {
        config(['listings.auto_publish_on_create' => true]);

        $seller = User::factory()->create(['role' => 'seller']);
        $token = $this->issueApiToken($seller);

        $uniqueTitle = 'VisibilityFeedTitle '.uniqid();
        $create = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => $uniqueTitle,
                'description' => 'Description for visibility test.',
                'image_urls' => ['https://example.com/listing-test.jpg'],
            ]);

        $create->assertCreated();
        $id = $create->json('data.id');
        $this->assertNotNull($id);

        $this->getJson('/api/v1/listings?per_page=50')
            ->assertOk()
            ->assertJsonFragment(['id' => $id]);
    }

    public function test_guest_gets_404_for_suspended_listing_on_listings_and_products_endpoints(): void
    {
        $product = Product::factory()->create([
            'status' => 'suspended',
            'moderation_status' => 'approved',
            'published_at' => now(),
        ]);

        $this->getJson('/api/v1/listings/'.$product->id)->assertNotFound();
        $this->getJson('/api/v1/products/'.$product->id)->assertNotFound();
        $this->postJson('/api/v1/products/'.$product->id.'/view', [])->assertNotFound();
        $this->getJson('/api/v1/products/'.$product->id.'/comments')->assertNotFound();
        $this->getJson('/api/v1/products/'.$product->id.'/bids')->assertNotFound();
    }

    public function test_owner_and_admin_can_view_suspended_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'status' => 'suspended',
            'moderation_status' => 'approved',
            'published_at' => now(),
        ]);

        $sellerToken = $this->issueApiToken($seller);
        $this->withHeader('Authorization', "Bearer {$sellerToken}")
            ->getJson('/api/v1/listings/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);

        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $this->issueApiToken($admin);
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/products/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);
    }

    public function test_auto_publish_off_leaves_pending_review_hidden_from_guests_not_from_owner(): void
    {
        config(['listings.auto_publish_on_create' => false]);

        $seller = User::factory()->create(['role' => 'seller']);
        $token = $this->issueApiToken($seller);

        $create = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/products', [
                'type' => 'offer',
                'title' => 'Pending title '.uniqid(),
                'description' => 'Pending body.',
                'image_urls' => ['https://example.com/pending.jpg'],
            ]);

        $create->assertCreated();
        $id = $create->json('data.id');
        $this->assertDatabaseHas('products', [
            'id' => $id,
            'status' => 'pending_review',
        ]);

        $this->withoutHeader('Authorization')
            ->getJson('/api/v1/listings/'.$id)
            ->assertNotFound();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/listings/'.$id)
            ->assertOk()
            ->assertJsonPath('data.id', $id);
    }

    public function test_admin_put_can_restore_public_visibility(): void
    {
        $product = Product::factory()->create([
            'status' => 'suspended',
            'moderation_status' => 'approved',
            'published_at' => now(),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $this->issueApiToken($admin);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson('/api/v1/admin/products/'.$product->id, [
                'status' => 'published',
                'moderation_status' => 'approved',
            ])
            ->assertOk();

        $this->getJson('/api/v1/listings/'.$product->id)
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);
    }
}
