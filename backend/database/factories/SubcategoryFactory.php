<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class SubcategoryFactory extends Factory
{
    protected $model = Subcategory::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->word();

        return [
            'category_id' => Category::factory(),
            'parent_id' => null,
            'name' => ucfirst($name),
            'slug' => Str::slug($name) . '-' . $this->faker->numberBetween(100, 999),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
