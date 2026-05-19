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
            PaymentMethodSeeder::class,
            HelpCmsSeeder::class,
            ContactPageSeeder::class,
            CmsPagesSeeder::class,
            CategoryListingSchemaSeeder::class,
            SeoDefaultsSeeder::class,
            ProductionAdminSeeder::class,
        ]);
    }
}
