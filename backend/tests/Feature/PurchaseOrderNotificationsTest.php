<?php

namespace Tests\Feature;

use App\Jobs\NotifySellerNewOrderSmsJob;
use App\Mail\NewOrderForSellerMail;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use App\Services\Notifications\PurchaseOrderNotifications;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PurchaseOrderNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function makePurchaseForSeller(User $seller): Purchase
    {
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'type' => 'offer',
            'status' => 'published',
            'price' => 100,
        ]);

        return Purchase::create([
            'product_id' => $product->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'amount' => 100,
            'quantity' => 1,
            'payment_method' => 'escrow',
            'status' => Purchase::STATUS_PENDING,
        ]);
    }

    public function test_sends_new_order_mail_when_mail_channel_enabled(): void
    {
        Mail::fake();
        Queue::fake();

        Config::set('notifications.events.purchase_new_seller.database', false);
        Config::set('notifications.events.purchase_new_seller.mail', true);
        Config::set('notifications.events.purchase_new_seller.sms', false);

        $seller = User::factory()->create(['email' => 'seller-notify@example.com']);
        $purchase = $this->makePurchaseForSeller($seller);

        app(PurchaseOrderNotifications::class)->notifySellerOfNewPurchase($purchase->fresh());

        Mail::assertSent(NewOrderForSellerMail::class, function (NewOrderForSellerMail $mail) use ($purchase) {
            return $mail->purchase->id === $purchase->id;
        });

        Queue::assertNotPushed(NotifySellerNewOrderSmsJob::class);
    }

    public function test_does_not_send_mail_when_mail_channel_disabled(): void
    {
        Mail::fake();

        Config::set('notifications.events.purchase_new_seller.database', false);
        Config::set('notifications.events.purchase_new_seller.mail', false);
        Config::set('notifications.events.purchase_new_seller.sms', false);

        $seller = User::factory()->create(['email' => 'seller-no-mail@example.com']);
        $purchase = $this->makePurchaseForSeller($seller);

        app(PurchaseOrderNotifications::class)->notifySellerOfNewPurchase($purchase->fresh());

        Mail::assertNothingSent();
    }

    public function test_dispatches_sms_job_only_when_sms_channel_enabled(): void
    {
        Mail::fake();
        Queue::fake();

        Config::set('notifications.events.purchase_new_seller.database', false);
        Config::set('notifications.events.purchase_new_seller.mail', false);
        Config::set('notifications.events.purchase_new_seller.sms', true);

        $seller = User::factory()->create(['email' => 'seller-sms@example.com', 'phone' => '0500000000']);
        $purchase = $this->makePurchaseForSeller($seller);

        app(PurchaseOrderNotifications::class)->notifySellerOfNewPurchase($purchase->fresh());

        Queue::assertPushed(NotifySellerNewOrderSmsJob::class, function (NotifySellerNewOrderSmsJob $job) use ($purchase) {
            return $job->purchaseId === $purchase->id;
        });
        Mail::assertNothingSent();
    }
}
