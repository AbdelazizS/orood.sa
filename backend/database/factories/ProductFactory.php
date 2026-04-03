<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\City;
use App\Models\Product;
use App\Models\Region;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $title = $this->faker->sentence(4);
        $category = Category::inRandomOrder()->first() ?? Category::factory()->create();
        $subcategory = $category->subcategories()->inRandomOrder()->first() ?? Subcategory::factory()->create([
            'category_id' => $category->id,
        ]);
        $region = Region::inRandomOrder()->first() ?? Region::factory()->create();
        $city = $region->cities()->inRandomOrder()->first() ?? City::factory()->create([
            'region_id' => $region->id,
        ]);

        return [
            'user_id' => User::factory(),
            'category_id' => $category->id,
            'subcategory_id' => $subcategory->id,
            'region_id' => $region->id,
            'city_id' => $city->id,
            'title' => $title,
            'slug' => Str::slug($title) . '-' . $this->faker->numberBetween(1000, 9999),
            'description' => $this->faker->paragraph(3),
            'price' => $this->faker->numberBetween(100, 5000),
            'condition' => $this->faker->randomElement(['new', 'used']),
            'warranty' => $this->faker->randomElement([null, '7 days', '30 days']),
            'is_offer' => $this->faker->boolean(),
            'type' => $this->faker->randomElement(['offer', 'request']),
            'contact_preferences' => [
                'phone' => $this->faker->phoneNumber(),
                'online' => $this->faker->boolean(),
            ],
            'shipping_details' => [
                'free_shipping' => $this->faker->boolean(),
                'free_returns' => $this->faker->boolean(),
            ],
            'stats' => [
                'views' => $this->faker->numberBetween(10, 500),
                'purchases' => $this->faker->numberBetween(0, 50),
                'messages' => $this->faker->numberBetween(0, 100),
            ],
            'media' => [
                'cover' => $this->faker->imageUrl(800, 600, 'business'),
            ],
            'tags' => $this->faker->randomElements(['Featured', 'Limited', 'Free Shipping'], 2),
            'status' => 'published',
            'published_at' => now()->subDays($this->faker->numberBetween(0, 30)),
        ];
    }
}
