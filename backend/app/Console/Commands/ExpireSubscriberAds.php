<?php

namespace App\Console\Commands;

use App\Services\Subscribers\SubscriberAdLifecycleService;
use Illuminate\Console\Command;

class ExpireSubscriberAds extends Command
{
    protected $signature = 'subscribers:expire-ads';

    protected $description = 'End subscriber ads past their duration and put the listings back to "awaiting a marketer".';

    public function handle(SubscriberAdLifecycleService $lifecycle): int
    {
        $count = $lifecycle->expireDue();
        $this->info("Expired {$count} subscriber ad(s).");

        return self::SUCCESS;
    }
}
