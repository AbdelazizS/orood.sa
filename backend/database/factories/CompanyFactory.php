<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\City;
use App\Models\Company;
use App\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        $name = $this->faker->company();

        $region = Region::inRandomOrder()->first() ?? Region::factory()->create();
        $city = $region->cities()->inRandomOrder()->first() ?? City::factory()->create([
            'region_id' => $region->id,
        ]);
        $category = Category::inRandomOrder()->first() ?? Category::factory()->create();

        return [
            'name' => $name,
            'slug' => Str::slug($name) . '-' . $this->faker->numberBetween(100, 999),
            'category_id' => $category->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'email' => $this->faker->companyEmail(),
            'phone' => $this->faker->phoneNumber(),
            'verification_status' => $this->faker->randomElement(['pending', 'verified']),
            'rating' => $this->faker->randomFloat(1, 3, 5),
        ];
    }
}
