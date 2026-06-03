<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SaudiRegionsSeeder::class,
            PermissionSeeder::class,
            CategorySeeder::class,
            CategoryListingSchemaSeeder::class,
            PaymentMethodSeeder::class,
            HelpCmsSeeder::class,
            ContactPageSeeder::class,
            CmsPagesSeeder::class,
            SeoDefaultsSeeder::class,
            ProductionAdminSeeder::class,
            FinanceModulesSeeder::class,
        ]);
    }
}
