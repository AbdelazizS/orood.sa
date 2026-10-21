<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductRealEstateDetail;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SubscriberAdPurchaseTest extends TestCase
{
    use RefreshDatabase;

    private Category $realEstate;

    private City $city;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->realEstate = Category::query()->where('slug', 'real-estate')->first()
            ?? Category::factory()->create(['slug' => 'real-estate']);
        $this->city = City::factory()->create();
    }

    private function token(User $user): string
    {
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill([
            'api_token' => hash('sha256', $plain),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plain;
    }

    /** Fresh auth per call: the API guard caches the user between requests in one test. */
    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->token($user));
    }

    private function subscriber(int $credits = 0): User
    {
        $user = User::factory()->create(['role' => 'subscriber']);
        if ($credits > 0) {
            SubscriberAdCredit::create(['subscriber_id' => $user->id, 'delta' => $credits, 'reason' => 'purchase']);
        }

        return $user;
    }

    private function awaitingListing(array $overrides = []): Product
    {
        $product = Product::factory()->create(array_merge([
            'status' => 'published',
            'moderation_status' => 'approved',
            'marketing_status' => Product::MARKETING_AWAITING,
            'category_id' => $this->realEstate->id,
            'city_id' => $this->city->id,
            'location_lat' => 24.71,
            'location_lng' => 46.67,
            'is_wholesale' => false,
            'price' => 1500000,
            'contact_phone' => '0500000000',
            'published_at' => now(),
        ], $overrides));

        ProductRealEstateDetail::query()->create([
            'product_id' => $product->id,
            'purpose' => 'sale',
            'property_type' => 'villa',
            'area_sqm' => 400,
        ]);

        return $product;
    }

    public function test_admin_creates_subscriber_with_credits_and_others_cannot(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->as($admin)->postJson('/api/v1/admin/subscribers', [
            'name' => 'مشترك تجريبي',
            'email' => 'sub@example.com',
            'credits' => 5,
        ])->assertCreated();

        $this->assertNotEmpty($response->json('meta.temporary_password'));
        $sub = User::query()->where('email', 'sub@example.com')->firstOrFail();
        $this->assertSame('subscriber', $sub->role);
        $this->assertSame(5, $sub->adCreditsBalance());

        $this->as($admin)->getJson('/api/v1/admin/subscribers')
            ->assertOk()
            ->assertJsonPath('data.0.credits_balance', 5);

        $this->as($admin)->postJson("/api/v1/admin/subscribers/{$sub->id}/credits", ['delta' => 3])
            ->assertOk()
            ->assertJsonPath('data.credits_balance', 8);
        $this->as($admin)->postJson("/api/v1/admin/subscribers/{$sub->id}/credits", ['delta' => -20])
            ->assertStatus(422);

        $seller = User::factory()->create(['role' => 'seller']);
        $this->as($seller)->postJson('/api/v1/admin/subscribers', ['name' => 'x', 'email' => 'x@example.com'])
            ->assertForbidden();
        $employee = User::factory()->create(['role' => 'employee']);
        $this->as($employee)->postJson('/api/v1/admin/subscribers', ['name' => 'x', 'email' => 'x@example.com'])
            ->assertForbidden();
    }

    public function test_only_subscribers_reach_the_subscriber_area(): void
    {
        $this->getJson('/api/v1/subscriber/available')->assertUnauthorized();
        $this->as(User::factory()->create(['role' => 'buyer']))->getJson('/api/v1/subscriber/available')->assertForbidden();
        $this->as(User::factory()->create(['role' => 'admin']))->getJson('/api/v1/subscriber/available')->assertForbidden();
        $this->as($this->subscriber())->getJson('/api/v1/subscriber/available')->assertOk();
    }

    public function test_subscriber_sees_full_details_of_awaiting_listing_but_public_does_not(): void
    {
        $listing = $this->awaitingListing();
        Product::factory()->create(['status' => 'published', 'moderation_status' => 'approved', 'marketing_status' => null]);
        $sub = $this->subscriber(1);

        $this->getJson('/api/v1/products/'.$listing->id)->assertOk()->assertJsonPath('data.price', null);

        $available = $this->as($sub)->getJson('/api/v1/subscriber/available')->assertOk();
        $this->assertSame([$listing->id], collect($available->json('data'))->pluck('id')->all());
        $this->assertEquals(1500000, $available->json('data.0.price'));

        $this->as($sub)->getJson('/api/v1/subscriber/products/'.$listing->id)
            ->assertOk()
            ->assertJsonPath('data.contact_phone', '0500000000')
            ->assertJsonPath('meta.can_buy', true);

        $map = $this->as($sub)->getJson('/api/v1/subscriber/available/map')->assertOk();
        $this->assertEquals(1500000, $map->json('data.0.price'));
    }

    public function test_buying_the_ad_spends_a_credit_and_makes_the_listing_public(): void
    {
        $owner = User::factory()->create(['role' => 'seller']);
        $listing = $this->awaitingListing(['user_id' => $owner->id]);
        $sub = $this->subscriber(2);

        $this->as($sub)->postJson("/api/v1/subscriber/products/{$listing->id}/buy")
            ->assertCreated()
            ->assertJsonPath('data.credits_balance', 1);

        $listing->refresh();
        $this->assertSame(Product::MARKETING_MARKETED, $listing->marketing_status);
        $this->assertSame(1, $sub->adCreditsBalance());

        // Price is now public (detail + map) and the listing left the "available" list.
        $this->app['auth']->forgetGuards();
        $this->withoutHeader('Authorization')->getJson('/api/v1/products/'.$listing->id)->assertOk();
        $this->assertEquals(1500000, $this->getJson('/api/v1/products/'.$listing->id)->json('data.price'));
        $marker = collect($this->getJson('/api/v1/listings/map')->json('data'))->firstWhere('id', $listing->id);
        $this->assertEquals(1500000, $marker['price']);

        $this->assertSame([], $this->as($sub)->getJson('/api/v1/subscriber/available')->json('data'));
        $this->as($sub)->getJson('/api/v1/subscriber/my-listings')
            ->assertOk()
            ->assertJsonPath('data.0.product.id', $listing->id);

        // The owner is told, without the subscriber's name.
        $note = Notification::query()->where('user_id', $owner->id)->where('type', 'listing_marketed')->first();
        $this->assertNotNull($note);
        $this->assertStringNotContainsString($sub->name, $note->body);
    }

    public function test_buy_rules_credits_double_buy_and_non_awaiting(): void
    {
        $listing = $this->awaitingListing();

        $this->as($this->subscriber(0))->postJson("/api/v1/subscriber/products/{$listing->id}/buy")
            ->assertStatus(422)->assertJsonValidationErrors('credits');

        $this->as($this->subscriber(1))->postJson("/api/v1/subscriber/products/{$listing->id}/buy")->assertCreated();

        $late = $this->subscriber(1);
        $this->as($late)->postJson("/api/v1/subscriber/products/{$listing->id}/buy")->assertStatus(422);
        $this->assertSame(1, $late->adCreditsBalance(), 'a failed buy must not spend a credit');
        $this->assertSame(1, SubscriberListing::query()->where('product_id', $listing->id)->count());

        $normal = Product::factory()->create(['status' => 'published', 'moderation_status' => 'approved']);
        $this->as($this->subscriber(1))->postJson("/api/v1/subscriber/products/{$normal->id}/buy")->assertStatus(422);

        $pending = $this->awaitingListing(['status' => 'pending_review', 'moderation_status' => 'pending']);
        $this->as($this->subscriber(1))->postJson("/api/v1/subscriber/products/{$pending->id}/buy")->assertStatus(422);
        $this->as($this->subscriber(1))->getJson("/api/v1/subscriber/products/{$pending->id}")->assertNotFound();
    }

    public function test_notes_are_private_to_subscriber_and_staff(): void
    {
        $owner = User::factory()->create(['role' => 'seller']);
        $listing = $this->awaitingListing(['user_id' => $owner->id]);
        $sub = $this->subscriber(1);
        $this->as($sub)->postJson("/api/v1/subscriber/products/{$listing->id}/buy")->assertCreated();
        $row = SubscriberListing::query()->where('product_id', $listing->id)->firstOrFail();
        $url = "/api/v1/subscriber-listings/{$row->id}/notes";

        $employee = User::factory()->create(['role' => 'employee']);
        $this->as($employee)->postJson($url, ['body' => 'اتصل عميل اليوم وطلب العقار بـ 1.4 مليون'])
            ->assertCreated()
            ->assertJsonPath('data.author.kind', 'staff');

        $this->assertTrue(Notification::query()
            ->where('user_id', $sub->id)->where('type', 'subscriber_listing_note')->exists());

        $this->as($sub)->postJson($url, ['body' => 'تم التواصل مع العميل'])->assertCreated();
        $this->as($sub)->getJson($url)->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.author.kind', 'staff')
            ->assertJsonPath('data.1.is_mine', true);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->as($admin)->getJson($url)->assertOk()->assertJsonCount(2, 'data');

        $this->as($owner)->getJson($url)->assertForbidden();
        $this->as($owner)->postJson($url, ['body' => 'x'])->assertForbidden();
        $this->as($this->subscriber())->getJson($url)->assertForbidden();
        $this->as(User::factory()->create(['role' => 'buyer']))->getJson($url)->assertForbidden();
        $this->as(User::factory()->create(['role' => 'assistant']))->getJson($url)->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withoutHeader('Authorization')->getJson($url)->assertUnauthorized();

        // Public comments on the listing never include the private notes.
        $comments = $this->getJson('/api/v1/products/'.$listing->id.'/comments')->getContent();
        $this->assertStringNotContainsString('1.4 مليون', $comments);
    }

    public function test_listing_with_newest_note_comes_first(): void
    {
        $sub = $this->subscriber(2);
        $first = $this->awaitingListing();
        $second = $this->awaitingListing();
        $this->as($sub)->postJson("/api/v1/subscriber/products/{$first->id}/buy")->assertCreated();
        $this->travel(1)->minutes();
        $this->as($sub)->postJson("/api/v1/subscriber/products/{$second->id}/buy")->assertCreated();

        // Newest purchase first while there are no notes.
        $this->assertSame($second->id, $this->as($sub)->getJson('/api/v1/subscriber/my-listings')->json('data.0.product.id'));

        $this->travel(1)->minutes();
        $row = SubscriberListing::query()->where('product_id', $first->id)->firstOrFail();
        $this->as(User::factory()->create(['role' => 'admin']))
            ->postJson("/api/v1/subscriber-listings/{$row->id}/notes", ['body' => 'متابعة'])->assertCreated();

        $mine = $this->as($sub)->getJson('/api/v1/subscriber/my-listings')->assertOk();
        $this->assertSame($first->id, $mine->json('data.0.product.id'));
        $this->assertSame(1, $mine->json('data.0.notes_count'));

        $this->as(User::factory()->create(['role' => 'employee']))->getJson('/api/v1/admin/subscriber-listings')
            ->assertOk()
            ->assertJsonPath('data.0.product.id', $first->id)
            ->assertJsonPath('data.0.subscriber.id', $sub->id);
    }

    public function test_unread_badge_like_whatsapp(): void
    {
        $sub = $this->subscriber(1);
        $listing = $this->awaitingListing();
        $this->as($sub)->postJson("/api/v1/subscriber/products/{$listing->id}/buy")->assertCreated();
        $row = SubscriberListing::query()->where('product_id', $listing->id)->firstOrFail();
        $url = "/api/v1/subscriber-listings/{$row->id}/notes";
        $employee = User::factory()->create(['role' => 'employee']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->travel(1)->minutes();
        $this->as($employee)->postJson($url, ['body' => 'اتصل عميل وطلب العقار'])->assertCreated();
        $this->as($employee)->postJson($url, ['body' => 'وطلب موعد معاينة'])->assertCreated();

        // Subscriber: 2 unread on the row and in the totals.
        $this->as($sub)->getJson('/api/v1/subscriber/my-listings')
            ->assertJsonPath('data.0.unread_count', 2)
            ->assertJsonPath('meta.unread_total', 2);
        $this->as($sub)->getJson('/api/v1/subscriber/overview')->assertJsonPath('data.unread_total', 2);

        // The author never sees their own notes as unread; another staff member does.
        $this->as($employee)->getJson('/api/v1/admin/subscriber-listings')->assertJsonPath('data.0.unread_count', 0);
        $this->as($admin)->getJson('/api/v1/admin/subscriber-listings')->assertJsonPath('data.0.unread_count', 2);

        // Opening the thread clears the badge for that viewer only.
        $this->travel(1)->minutes();
        $this->as($sub)->getJson($url)->assertOk();
        $this->as($sub)->getJson('/api/v1/subscriber/my-listings')->assertJsonPath('data.0.unread_count', 0);
        $this->as($admin)->getJson('/api/v1/admin/subscriber-listings')->assertJsonPath('data.0.unread_count', 2);

        // Subscriber replies → unread for staff, not for the subscriber.
        $this->travel(1)->minutes();
        $this->as($sub)->postJson($url, ['body' => 'تم التواصل'])->assertCreated();
        $this->as($sub)->getJson('/api/v1/subscriber/my-listings')->assertJsonPath('data.0.unread_count', 0);
        $this->as($employee)->getJson('/api/v1/admin/subscriber-listings')->assertJsonPath('data.0.unread_count', 1);
    }

    public function test_subscriber_is_hidden_and_cannot_post_listings(): void
    {
        $sub = $this->subscriber();
        $sub->forceFill(['username' => 'hidden_sub'])->save();

        $this->getJson('/api/v1/profile/hidden_sub')->assertNotFound();
        $this->getJson('/api/v1/profile/by-id/'.$sub->id)->assertNotFound();

        $this->as($sub)->postJson('/api/v1/products', [
            'type' => 'offer',
            'title' => 'x',
            'description' => 'y',
        ])->assertForbidden();
    }
}
