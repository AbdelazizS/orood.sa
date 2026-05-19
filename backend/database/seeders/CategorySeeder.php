<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Region;
use App\Models\Subcategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Production-safe category tree. Slugs align with SEO/footer (cars not vehicles).
     */
    public function run(): void
    {
        $categories = [
            'Real Estate' => [
                'slug' => 'real-estate',
                'name_ar' => 'العقارات',
                'icon' => 'Home',
                'subcats' => [
                    ['en' => 'Apartments', 'ar' => 'شقق'],
                    ['en' => 'Villas', 'ar' => 'فلل'],
                    ['en' => 'Land', 'ar' => 'أراضي'],
                ],
            ],
            'Electronics' => [
                'slug' => 'electronics',
                'name_ar' => 'إلكترونيات',
                'icon' => 'Tv',
                'subcats' => [
                    ['en' => 'Mobiles', 'ar' => 'جوالات'],
                    ['en' => 'Laptops', 'ar' => 'لابتوبات'],
                    ['en' => 'TVs', 'ar' => 'تلفزيونات'],
                ],
            ],
            'Furniture' => [
                'slug' => 'furniture',
                'name_ar' => 'أثاث',
                'icon' => 'Sofa',
                'subcats' => [
                    ['en' => 'Living Room', 'ar' => 'غرفة المعيشة'],
                    ['en' => 'Bedroom', 'ar' => 'غرفة النوم'],
                    ['en' => 'Office', 'ar' => 'مكتب'],
                    ['en' => 'Outdoor', 'ar' => 'حديقة'],
                ],
            ],
            'Food & Groceries' => [
                'slug' => 'food-groceries',
                'name_ar' => 'مواد غذائية',
                'icon' => 'Apple',
                'subcats' => [
                    ['en' => 'Fresh Produce', 'ar' => 'خضروات وفواكه'],
                    ['en' => 'Dairy', 'ar' => 'ألبان'],
                    ['en' => 'Beverages', 'ar' => 'مشروبات'],
                    ['en' => 'Snacks', 'ar' => 'وجبات خفيفة'],
                ],
            ],
            'Vehicles' => [
                'slug' => 'cars',
                'name_ar' => 'سيارات',
                'icon' => 'Car',
                'subcats' => [
                    ['en' => 'Cars', 'ar' => 'سيارات'],
                    ['en' => 'Motorcycles', 'ar' => 'دراجات نارية'],
                    ['en' => 'Trucks', 'ar' => 'شاحنات'],
                    ['en' => 'Spare Parts', 'ar' => 'قطع غيار'],
                ],
            ],
            'Clothing' => [
                'slug' => 'clothing',
                'name_ar' => 'ملابس',
                'icon' => 'Shirt',
                'subcats' => [
                    ['en' => 'Men', 'ar' => 'رجال'],
                    ['en' => 'Women', 'ar' => 'نساء'],
                    ['en' => 'Children', 'ar' => 'أطفال'],
                    ['en' => 'Accessories', 'ar' => 'إكسسوارات'],
                ],
            ],
            'Home & Garden' => [
                'slug' => 'home-garden',
                'name_ar' => 'منزل وحديقة',
                'icon' => 'TreeDeciduous',
                'subcats' => [
                    ['en' => 'Kitchen', 'ar' => 'مطبخ'],
                    ['en' => 'Bathroom', 'ar' => 'حمام'],
                    ['en' => 'Garden', 'ar' => 'حديقة'],
                    ['en' => 'Tools', 'ar' => 'أدوات'],
                ],
            ],
            'Sports & Leisure' => [
                'slug' => 'sports-leisure',
                'name_ar' => 'رياضة وترفيه',
                'icon' => 'Dumbbell',
                'subcats' => [
                    ['en' => 'Fitness', 'ar' => 'لياقة'],
                    ['en' => 'Outdoor', 'ar' => 'هواء الطلق'],
                    ['en' => 'Water Sports', 'ar' => 'رياضات مائية'],
                    ['en' => 'Games', 'ar' => 'ألعاب'],
                ],
            ],
            'Books & Education' => [
                'slug' => 'books-education',
                'name_ar' => 'كتب وتعليم',
                'icon' => 'BookOpen',
                'subcats' => [
                    ['en' => 'Books', 'ar' => 'كتب'],
                    ['en' => 'Stationery', 'ar' => 'قرطاسية'],
                    ['en' => 'Courses', 'ar' => 'دورات'],
                ],
            ],
            'Health & Beauty' => [
                'slug' => 'health-beauty',
                'name_ar' => 'صحة وجمال',
                'icon' => 'Heart',
                'subcats' => [
                    ['en' => 'Skincare', 'ar' => 'العناية بالبشرة'],
                    ['en' => 'Makeup', 'ar' => 'مكياج'],
                    ['en' => 'Fragrances', 'ar' => 'عطور'],
                ],
            ],
            'Pets' => [
                'slug' => 'pets',
                'name_ar' => 'حيوانات أليفة',
                'icon' => 'Dog',
                'subcats' => [
                    ['en' => 'Dogs', 'ar' => 'كلاب'],
                    ['en' => 'Cats', 'ar' => 'قطط'],
                    ['en' => 'Birds', 'ar' => 'طيور'],
                ],
            ],
            'Services' => [
                'slug' => 'services',
                'name_ar' => 'خدمات',
                'icon' => 'Wrench',
                'subcats' => [
                    ['en' => 'Cleaning', 'ar' => 'تنظيف'],
                    ['en' => 'Repair', 'ar' => 'إصلاح'],
                    ['en' => 'Moving', 'ar' => 'نقل'],
                ],
            ],
        ];

        foreach ($categories as $name => $data) {
            $slug = $data['slug'] ?? Str::slug($name);
            $category = Category::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'name_ar' => $data['name_ar'] ?? null,
                    'name_en' => $name,
                    'icon' => $data['icon'] ?? null,
                    'is_active' => true,
                ],
            );

            foreach ($data['subcats'] as $subcat) {
                $subName = is_array($subcat) ? $subcat['en'] : $subcat;
                $subAr = is_array($subcat) ? ($subcat['ar'] ?? null) : null;
                Subcategory::updateOrCreate(
                    [
                        'category_id' => $category->id,
                        'slug' => Str::slug($slug.'-'.$subName),
                    ],
                    [
                        'name' => $subName,
                        'name_ar' => $subAr,
                        'name_en' => $subName,
                        'is_active' => true,
                    ],
                );
            }
        }

        $allCategories = Category::all();
        $regions = Region::all();
        foreach ($allCategories as $category) {
            foreach ($regions as $region) {
                $category->regions()->syncWithoutDetaching([
                    $region->id => ['is_visible' => true, 'wholesale_visible' => false],
                ]);
            }
        }
    }
}
