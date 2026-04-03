<?php

namespace Database\Factories;

use App\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RegionFactory extends Factory
{
    protected $model = Region::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->city();

        return [
            'name' => $name,
            'slug' => Str::slug($name) . '-' . $this->faker->numberBetween(100, 999),
            'is_active' => true,
        ];
    }
}
