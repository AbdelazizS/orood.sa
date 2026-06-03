<?php

namespace Database\Seeders;

use App\Services\Finance\FinanceModuleSettings;
use Illuminate\Database\Seeder;

class FinanceModulesSeeder extends Seeder
{
    public function run(): void
    {
        app(FinanceModuleSettings::class)->update(FinanceModuleSettings::defaults());
    }
}
