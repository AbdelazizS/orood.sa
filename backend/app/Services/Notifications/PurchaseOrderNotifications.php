<?php

namespace App\Services\Notifications;

use App\Jobs\NotifySellerNewOrderSmsJob;
use App\Mail\NewOrderForSellerMail;
use App\Models\Notification;
use App\Models\Purchase;
use Illuminate\Support\Facades\Mail;

class PurchaseOrderNotifications
{
    /**
     * After a purchase is committed: in-app notification (optional), email, SMS (optional).
     */
    public function notifySellerOfNewPurchase(Purchase $purchase): void
    {
        $purchase->loadMissing(['product', 'buyer', 'seller']);

        $event = config('notifications.events.purchase_new_seller', []);

        if (($event['database'] ?? true) && $purchase->seller_id) {
            Notification::create([
                'user_id' => $purchase->seller_id,
                'type' => 'purchase_new',
                'title' => __('New order'),
                'body' => __(':buyer ordered :qty × :product.', [
                    'buyer' => $purchase->buyer?->name ?? __('Buyer'),
                    'qty' => (int) ($purchase->quantity ?? 1),
                    'product' => $purchase->product?->title ?? '',
                ]),
                'data' => [
                    'purchase_id' => $purchase->id,
                    'link' => '/dashboard/orders/'.$purchase->id,
                ],
            ]);
        }

        if (($event['mail'] ?? false) && $purchase->seller?->email) {
            Mail::to($purchase->seller->email)->send(new NewOrderForSellerMail($purchase));
        }

        if ($event['sms'] ?? false) {
            NotifySellerNewOrderSmsJob::dispatch($purchase->id);
        }
    }
}
