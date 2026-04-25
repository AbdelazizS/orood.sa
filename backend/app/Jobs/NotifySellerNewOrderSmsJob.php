<?php

namespace App\Jobs;

use App\Contracts\SmsSender;
use App\Models\Purchase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifySellerNewOrderSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $purchaseId,
    ) {}

    public function handle(SmsSender $smsSender): void
    {
        if (!config('notifications.events.purchase_new_seller.sms')) {
            return;
        }

        $purchase = Purchase::with(['seller', 'product', 'buyer'])->find($this->purchaseId);
        if (!$purchase || !$purchase->seller?->phone) {
            return;
        }

        $body = __('New order #:id — :product', [
            'id' => $purchase->id,
            'product' => $purchase->product?->title ?? '',
        ]);

        $smsSender->send((string) $purchase->seller->phone, $body);
    }
}
