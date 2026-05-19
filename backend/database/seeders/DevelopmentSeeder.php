<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProductionSeeder::class,
            PhaseOneSeeder::class,
            ProfileSeeder::class,
        ]);
    }
}
