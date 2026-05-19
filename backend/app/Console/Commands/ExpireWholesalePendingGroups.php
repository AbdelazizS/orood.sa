<?php

namespace App\Console\Commands;

use App\Services\WholesaleReservationLifecycleService;
use Illuminate\Console\Command;

class ExpireWholesalePendingGroups extends Command
{
    protected $signature = 'wholesale:expire-pending-groups';

    protected $description = 'Expire incomplete wholesale group reservations after the configured TTL';

    public function handle(WholesaleReservationLifecycleService $lifecycle): int
    {
        $count = $lifecycle->expireIncompletePendingGroups();

        $this->info("Expired {$count} wholesale reservation(s).");

        return self::SUCCESS;
    }
}
