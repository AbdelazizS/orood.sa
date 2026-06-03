<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('db:seed', [
            '--class' => 'Database\\Seeders\\CategorySeeder',
            '--force' => true,
        ]);

        Artisan::call('db:seed', [
            '--class' => 'Database\\Seeders\\CategoryListingSchemaSeeder',
            '--force' => true,
        ]);

        Cache::forget('api.categories');
    }

    public function down(): void
    {
        Cache::forget('api.categories');
    }
};
