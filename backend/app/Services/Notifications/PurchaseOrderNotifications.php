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
            $isWholesale = $purchase->group_buy_reservation_id !== null;
            $buyerName = $purchase->buyer?->name ?? __('Buyer');
            $qty = (int) ($purchase->quantity ?? 1);
            $productTitle = $purchase->product?->title ?? '';
            $body = $isWholesale
                ? __('wholesale.seller_new_wholesale_order', [
                    'buyer' => $buyerName,
                    'qty' => $qty,
                    'product' => $productTitle,
                ])
                : __(':buyer ordered :qty × :product.', [
                    'buyer' => $buyerName,
                    'qty' => $qty,
                    'product' => $productTitle,
                ]);

            $paymentMethod = (string) ($purchase->payment_method ?? '');
            $i18nType = match ($paymentMethod) {
                'direct_transfer' => 'purchase_new_direct',
                'cod' => 'purchase_new_cod',
                default => 'purchase_new',
            };

            Notification::create([
                'user_id' => $purchase->seller_id,
                'type' => 'purchase_new',
                'title' => $isWholesale ? __('wholesale.seller_new_wholesale_order_title') : __('New order'),
                'body' => $body,
                'data' => [
                    'purchase_id' => $purchase->id,
                    'link' => '/dashboard/orders/'.$purchase->id,
                    'is_wholesale' => $isWholesale,
                    'payment_method' => $paymentMethod,
                    'i18n_title_key' => "notifications.types.{$i18nType}.title",
                    'i18n_body_key' => "notifications.types.{$i18nType}.body",
                    'i18n_params' => [
                        'buyer' => $buyerName,
                        'qty' => $qty,
                        'productTitle' => $productTitle,
                        'orderNumber' => 'ORD-'.str_pad((string) $purchase->id, 6, '0', STR_PAD_LEFT),
                    ],
                    'actions' => array_values(array_filter([
                        [
                            'i18n_label_key' => 'notifications.actions.openOrder',
                            'href' => '/dashboard/orders/'.$purchase->id,
                            'intent' => 'open_order',
                        ],
                        $paymentMethod === 'direct_transfer' ? [
                            'i18n_label_key' => 'notifications.actions.confirmTransferReceived',
                            'href' => '/dashboard/orders/'.$purchase->id,
                            'intent' => 'confirm_direct_transfer',
                        ] : null,
                    ])),
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
