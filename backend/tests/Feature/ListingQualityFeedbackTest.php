<?php

namespace Tests\Feature;

use App\Models\ListingReport;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Buyer feedback on a listing: «مطابق للصور» %, «سرعة التوصيل» %, complaints count. */
class ListingQualityFeedbackTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    private function deliveredPurchase(Product $product, User $buyer): Purchase
    {
        return Purchase::query()->create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $product->user_id,
            'amount' => 100,
            'quantity' => 1,
            'payment_method' => 'cash',
            'status' => Purchase::STATUS_DELIVERED,
        ]);
    }

    public function test_buyers_answers_become_percentages_on_the_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $product = Product::factory()->create(['user_id' => $seller->id, 'status' => 'published', 'moderation_status' => 'approved']);

        $answers = [[true, 'fast'], [true, 'normal'], [false, 'slow'], [true, 'fast']];
        foreach ($answers as [$matches, $speed]) {
            $buyer = User::factory()->create(['role' => 'buyer']);
            $purchase = $this->deliveredPurchase($product, $buyer);
            $this->as($buyer)->postJson('/api/v1/reviews', [
                'target_id' => $seller->id,
                'purchase_id' => $purchase->id,
                'rating' => 5,
                'matches_photos' => $matches,
                'delivery_speed' => $speed,
            ])->assertCreated();
        }
        ListingReport::query()->create(['product_id' => $product->id, 'user_id' => User::factory()->create()->id, 'reason' => 'other', 'message' => 'لم يطابق الصور', 'status' => ListingReport::STATUS_NEW]);

        $this->app['auth']->forgetGuards();
        $quality = $this->withoutHeader('Authorization')->getJson('/api/v1/listings/'.$product->id)->assertOk()->json('data.quality');

        $this->assertSame(4, $quality['ratings_count']);
        $this->assertSame(75, $quality['matches_photos_pct']);       // 3 of 4
        $this->assertSame(63, $quality['delivery_speed_pct']);       // (100+50+0+100)/4 = 62.5
        $this->assertSame(1, $quality['complaints_count']);
    }

    public function test_listing_without_feedback_has_empty_percentages_and_seller_answers_are_ignored(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $product = Product::factory()->create(['user_id' => $seller->id, 'status' => 'published', 'moderation_status' => 'approved']);
        $purchase = $this->deliveredPurchase($product, $buyer);

        // The seller rating the buyer can't answer the listing questions.
        $this->as($seller)->postJson('/api/v1/reviews', [
            'target_id' => $buyer->id, 'purchase_id' => $purchase->id, 'rating' => 4, 'matches_photos' => true,
        ])->assertCreated();

        $this->app['auth']->forgetGuards();
        $quality = $this->withoutHeader('Authorization')->getJson('/api/v1/listings/'.$product->id)->json('data.quality');
        $this->assertSame(0, $quality['ratings_count']);
        $this->assertNull($quality['matches_photos_pct']);
        $this->assertNull($quality['delivery_speed_pct']);
    }
}
