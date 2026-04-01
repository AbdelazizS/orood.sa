<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SaudiRegionsSeeder::class,
            PhaseOneSeeder::class,
            ProfileSeeder::class,
            PermissionSeeder::class,
        ]);
    }
}
