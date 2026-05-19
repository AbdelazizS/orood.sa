<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\CompanyLocationSyncService;
use Illuminate\Console\Command;

class SyncCompanyLocationFromUser extends Command
{
    protected $signature = 'companies:sync-location-from-user';

    protected $description = 'Copy users.city_id to companies.city_id and region_id for company accounts';

    public function handle(CompanyLocationSyncService $sync): int
    {
        $updated = 0;

        User::query()
            ->where('role', 'company')
            ->whereNotNull('city_id')
            ->with('company')
            ->chunkById(100, function ($users) use ($sync, &$updated) {
                foreach ($users as $user) {
                    if (! $user->company) {
                        continue;
                    }
                    $sync->syncFromCityId($user->company, (int) $user->city_id);
                    $updated++;
                }
            });

        $this->info("Synced location for {$updated} companies.");

        return self::SUCCESS;
    }
}
