<?php

namespace App\Console\Commands;

use Database\Seeders\CategoryListingSchemaSeeder;
use Illuminate\Console\Command;

class SyncListingSchemasCommand extends Command
{
    protected $signature = 'listing-schemas:sync';

    protected $description = 'Sync default published listing schemas (real estate, vehicles, electronics)';

    public function handle(): int
    {
        $this->info('Syncing category listing schemas...');
        (new CategoryListingSchemaSeeder)->run();
        $this->info('Done.');

        return self::SUCCESS;
    }
}
