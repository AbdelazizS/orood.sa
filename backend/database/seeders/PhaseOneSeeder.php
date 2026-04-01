<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Bid;
use App\Models\Category;
use App\Models\City;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Favorite;
use App\Models\Message;
use App\Models\Product;
use App\Models\Region;
use App\Models\SavedSearch;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PhaseOneSeeder extends Seeder
{
    public function run(): void
    {
        // Categories + Subcategories (with Arabic) — Lucide icon names for dynamic icons
        $categories = [
            'Real Estate' => [
                'name_ar' => 'العقارات',
                'icon' => 'Home',
                'subcats' => [
                    ['en' => 'Apartments', 'ar' => 'شقق'],
                    ['en' => 'Villas', 'ar' => 'فلل'],
                    ['en' => 'Land', 'ar' => 'أراضي'],
                ],
            ],
            'Electronics' => [
                'name_ar' => 'إلكترونيات',
                'icon' => 'Tv',
                'subcats' => [
                    ['en' => 'Mobiles', 'ar' => 'جوالات'],
                    ['en' => 'Laptops', 'ar' => 'لابتوبات'],
                    ['en' => 'TVs', 'ar' => 'تلفزيونات'],
                ],
            ],
            'Furniture' => [
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
                'name_ar' => 'كتب وتعليم',
                'icon' => 'BookOpen',
                'subcats' => [
                    ['en' => 'Books', 'ar' => 'كتب'],
                    ['en' => 'Stationery', 'ar' => 'قرطاسية'],
                    ['en' => 'Courses', 'ar' => 'دورات'],
                ],
            ],
            'Health & Beauty' => [
                'name_ar' => 'صحة وجمال',
                'icon' => 'Heart',
                'subcats' => [
                    ['en' => 'Skincare', 'ar' => 'العناية بالبشرة'],
                    ['en' => 'Makeup', 'ar' => 'مكياج'],
                    ['en' => 'Fragrances', 'ar' => 'عطور'],
                ],
            ],
            'Pets' => [
                'name_ar' => 'حيوانات أليفة',
                'icon' => 'Dog',
                'subcats' => [
                    ['en' => 'Dogs', 'ar' => 'كلاب'],
                    ['en' => 'Cats', 'ar' => 'قطط'],
                    ['en' => 'Birds', 'ar' => 'طيور'],
                ],
            ],
            'Services' => [
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
            $category = Category::updateOrCreate(
                ['slug' => Str::slug($name)],
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
                        'slug' => Str::slug($category->name . '-' . $subName),
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

        // Regions + Cities are created by SaudiRegionsSeeder (runs first)

        // Category-Region visibility (all visible by default; wholesale off by default)
        $categories = Category::all();
        $regions = Region::all();
        foreach ($categories as $category) {
            foreach ($regions as $region) {
                $category->regions()->syncWithoutDetaching([
                    $region->id => ['is_visible' => true, 'wholesale_visible' => false],
                ]);
            }
        }

        // Demo Users (super_admin, admin, manager, seller, buyer)
        User::firstOrCreate(
            ['email' => 'super@arooth.sa'],
            [
                'name' => 'Super Admin',
                'phone' => '966500000099',
                'role' => 'super_admin',
                'password' => bcrypt('password'),
            ],
        );
        User::firstOrCreate(
            ['email' => 'admin@arooth.sa'],
            [
                'name' => 'Admin',
                'phone' => '966500000001',
                'role' => 'admin',
                'password' => bcrypt('password'),
            ],
        );
        User::firstOrCreate(
            ['email' => 'manager@arooth.sa'],
            [
                'name' => 'Manager',
                'phone' => '966500000002',
                'role' => 'manager',
                'password' => bcrypt('password'),
            ],
        );
        $user = User::firstOrCreate(
            ['email' => 'demo@arooth.sa'],
            [
                'name' => 'Demo Seller',
                'phone' => '966500000000',
                'role' => 'seller',
                'password' => bcrypt('password'),
            ],
        );
        User::firstOrCreate(
            ['email' => 'buyer@arooth.sa'],
            [
                'name' => 'Demo Buyer',
                'phone' => '966500000003',
                'role' => 'buyer',
                'password' => bcrypt('password'),
            ],
        );
        $seller2 = User::firstOrCreate(
            ['email' => 'seller2@arooth.sa'],
            [
                'name' => 'Second Seller',
                'phone' => '966500000004',
                'role' => 'seller',
                'password' => bcrypt('password'),
            ],
        );

        // Demo Products — Saudi locations, used items, real local feel
        // Images: Saudi/Middle East real estate, used electronics, local landmarks
        // Real estate: Riyadh towers, Jeddah corniche, desert land, modern Arabic architecture
        $products = [
            [
                'title' => 'شقة فاخرة في الرياض',
                'description' => '3 غرف نوم، تصميم عصري، موقع مميز في حي النخيل',
                'price' => 500000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Apartments',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1546412414-e1885259563a',
                'accept_bids' => true,
                'bids_visible' => true,
                'seller' => 'demo',
            ],
            [
                'title' => 'iPhone 15 Pro مستعمل',
                'description' => 'استخدام شخصي 3 أشهر، بحالة ممتازة مع الضمان',
                'price' => 4500,
                'condition' => 'used',
                'warranty' => '6 months',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Eastern Province',
                'city' => 'Dammam',
                'image_url' => 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
                'accept_bids' => true,
                'bids_visible' => false,
                'seller' => 'demo',
            ],
            [
                'title' => 'فيلا في الدرعية',
                'description' => '5 غرف نوم، مسبح، حديقة، قريبة من وادي حنيفة',
                'price' => 1800000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Villas',
                'region' => 'Riyadh',
                'city' => 'Diriyah',
                'image_url' => 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
            ],
            [
                'title' => 'Samsung Galaxy S24 مستعمل',
                'description' => 'استخدام شهرين فقط، كامل المواصفات',
                'price' => 3800,
                'condition' => 'used',
                'warranty' => '10 months',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c',
            ],
            [
                'title' => 'MacBook Pro M3 مستعمل',
                'description' => 'استخدام 4 أشهر، جدة — استلام يدوي',
                'price' => 12000,
                'condition' => 'used',
                'warranty' => '30 days',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Laptops',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
                'accept_bids' => true,
                'bids_visible' => true,
                'seller' => 'seller2',
            ],
            [
                'title' => 'أرض سكنية في الدمام',
                'description' => '500 متر، حي الراكة، قريبة من الخدمات',
                'price' => 250000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Land',
                'region' => 'Eastern Province',
                'city' => 'Dammam',
                'image_url' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64',
            ],
            [
                'title' => 'تلفزيون سمارت 55 بوصة مستعمل',
                'description' => '4K OLED، استخدام سنة، حالة جيدة جداً',
                'price' => 3500,
                'condition' => 'used',
                'warranty' => '30 days',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'TVs',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1593784991095-a205069470b6',
            ],
            [
                'title' => 'شقة كورنيش جدة',
                'description' => '2 غرفة نوم، إطلالة بحر، حي الحمراء',
                'price' => 750000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Apartments',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
            ],
            [
                'title' => 'Dell XPS 15 مستعمل',
                'description' => 'لابتوب ألعاب، استخدام 6 أشهر — الخبر',
                'price' => 6500,
                'condition' => 'used',
                'warranty' => '7 days',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Laptops',
                'region' => 'Eastern Province',
                'city' => 'Khobar',
                'image_url' => 'https://images.unsplash.com/photo-1593642632559-0c6d11fc6ef7',
                'accept_bids' => true,
                'bids_visible' => true,
                'seller' => 'seller2',
            ],
            [
                'title' => 'استوديو قرب الحرم — مكة',
                'description' => 'مفروش، قريب من الحرم، مناسب للمعتمرين',
                'price' => 420000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Apartments',
                'region' => 'Makkah',
                'city' => 'Makkah City',
                'image_url' => 'https://images.unsplash.com/photo-1600585154340-0c8f9f1f7f1d',
            ],
            [
                'title' => 'PlayStation 5 جديد',
                'description' => 'صندوق مغلق، ضمان سنة — الدرعية',
                'price' => 2200,
                'condition' => 'new',
                'warranty' => '1 year',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'TVs',
                'region' => 'Riyadh',
                'city' => 'Diriyah',
                'image_url' => 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3',
            ],
            [
                'title' => 'أرض زراعية الرياض',
                'description' => '2000 متر، طريق الخرج، مناسبة للاستثمار',
                'price' => 180000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Land',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
            ],
            [
                'title' => 'OnePlus 12 جديد',
                'description' => 'صندوق مغلق، ضمان سنة — جدة',
                'price' => 3200,
                'condition' => 'new',
                'warranty' => '1 year',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
            ],
            [
                'title' => 'فيلا عائلية الخبر',
                'description' => '6 غرف نوم، حديقة، حي الشاطئ',
                'price' => 2200000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Villas',
                'region' => 'Eastern Province',
                'city' => 'Khobar',
                'image_url' => 'https://images.unsplash.com/photo-1613490493576-7fde63acd811',
            ],
            [
                'title' => 'LG OLED 65 بوصة مستعمل',
                'description' => 'استخدام سنة، حالة ممتازة — الدمام',
                'price' => 4800,
                'condition' => 'used',
                'warranty' => '30 days',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'TVs',
                'region' => 'Eastern Province',
                'city' => 'Dammam',
                'image_url' => 'https://images.unsplash.com/photo-1485846234645-a62644f84728',
            ],
            [
                'title' => 'أبحث عن iPhone 14',
                'description' => 'مطلوب iPhone 14 Pro Max، أي لون',
                'price' => 3500,
                'condition' => 'used',
                'warranty' => null,
                'is_offer' => false,
                'type' => 'request',
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
            ],
            [
                'title' => 'بنتهاوس الرياض',
                'description' => 'آخر طابق، تراس، إطلالة 360',
                'price' => 1200000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Apartments',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
            ],
            [
                'title' => 'iPad Pro M2',
                'description' => '12.9 بوصة، 256 جيجا — مكة',
                'price' => 4500,
                'condition' => 'new',
                'warranty' => '1 year',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Laptops',
                'region' => 'Makkah',
                'city' => 'Makkah City',
                'image_url' => 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0',
            ],
            [
                'title' => 'أرض استثمارية جدة',
                'description' => 'منطقة تجارية، 750 متر',
                'price' => 680000,
                'condition' => 'new',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Real Estate',
                'subcategory' => 'Land',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
            ],
            [
                'title' => 'HP Pavilion مستعمل',
                'description' => 'i7، 16 جيجا رام، استخدام سنة — الدرعية',
                'price' => 2800,
                'condition' => 'used',
                'warranty' => '7 days',
                'is_offer' => true,
                'type' => 'offer',
                'category' => 'Electronics',
                'subcategory' => 'Laptops',
                'region' => 'Riyadh',
                'city' => 'Diriyah',
                'image_url' => 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
            ],
        ];

        $buyerUser = User::where('email', 'buyer@arooth.sa')->first();

        foreach ($products as $index => $data) {
            $category = Category::where('name', $data['category'])->first();
            $subcategory = Subcategory::where('name', $data['subcategory'])
                ->where('category_id', $category?->id)
                ->first();
            $region = Region::where('name', $data['region'])->first();
            $city = City::where('name', $data['city'])->first();

            $sellerUser = ($data['seller'] ?? 'demo') === 'seller2' ? $seller2 : $user;

            $slug = Str::slug($data['title']) . '-' . ($index + 1);
            $acceptBids = $data['accept_bids'] ?? false;
            $bidsVisible = $data['bids_visible'] ?? true;

            $product = Product::updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => $data['title'],
                    'description' => $data['description'],
                    'price' => $data['price'],
                    'condition' => $data['condition'],
                    'warranty' => $data['warranty'],
                    'is_offer' => $data['is_offer'],
                    'type' => $data['type'],
                    'accept_bids' => $acceptBids,
                    'bids_visible' => $bidsVisible,
                    'category_id' => $category?->id,
                    'subcategory_id' => $subcategory?->id,
                    'region_id' => $region?->id,
                    'city_id' => $city?->id,
                    'user_id' => $sellerUser->id,
                    'image_url' => $data['image_url'],
                    'media' => [
                        'cover' => $data['image_url'],
                        'gallery' => array_filter([
                            $data['image_url'],
                            $data['image_url'],
                        ]),
                    ],
                    'contact_preferences' => ['phone' => true, 'messages' => true],
                    'shipping_details' => [
                        'free_shipping' => fake()->boolean(30),
                        'free_return' => fake()->boolean(20),
                        'view_at_client' => fake()->boolean(40),
                    ],
                    'stats' => [
                        'views' => fake()->numberBetween(10, 500),
                        'purchases' => fake()->numberBetween(0, 50),
                        'messages' => fake()->numberBetween(0, 30),
                        'orders' => fake()->numberBetween(0, 25),
                    ],
                    'status' => 'published',
                    'moderation_status' => 'approved',
                    'published_at' => now(),
                ]
            );

            // Bids on products that accept them
            if ($acceptBids && $buyerUser && in_array($index, [0, 1, 4])) {
                Bid::firstOrCreate(
                    ['product_id' => $product->id, 'user_id' => $buyerUser->id],
                    ['amount' => (float) $data['price'] * 0.9, 'message' => 'Interested, can negotiate', 'is_visible' => true]
                );
            }
        }

        // Favorites for buyer
        $buyerUser = User::where('email', 'buyer@arooth.sa')->first();
        if ($buyerUser) {
            $sampleProducts = Product::limit(4)->get();
            foreach ($sampleProducts as $p) {
                Favorite::firstOrCreate(
                    ['user_id' => $buyerUser->id, 'product_id' => $p->id]
                );
            }
        }

        // Saved searches for buyer
        if ($buyerUser) {
            SavedSearch::firstOrCreate(
                ['user_id' => $buyerUser->id, 'query' => 'apartment'],
                ['filters' => ['category_id' => Category::where('name', 'Real Estate')->first()?->id], 'name' => 'Apartments']
            );
            SavedSearch::firstOrCreate(
                ['user_id' => $buyerUser->id, 'query' => 'iPhone'],
                ['filters' => [], 'name' => 'iPhones']
            );
        }

        // Conversations and messages
        $product1 = Product::where('title', 'Luxury Apartment in Riyadh')->first();
        if ($product1 && $buyerUser) {
            $conv = Conversation::firstOrCreate(
                ['product_id' => $product1->id, 'buyer_id' => $buyerUser->id, 'seller_id' => $product1->user_id]
            );
            Message::firstOrCreate(
                ['conversation_id' => $conv->id, 'user_id' => $buyerUser->id, 'body' => 'Is this still available?'],
                ['read' => true]
            );
            Message::firstOrCreate(
                ['conversation_id' => $conv->id, 'user_id' => $product1->user_id, 'body' => 'Yes, it is. When would you like to view?'],
                ['read' => true]
            );
            Message::firstOrCreate(
                ['conversation_id' => $conv->id, 'user_id' => $buyerUser->id, 'body' => 'Tomorrow afternoon works.'],
                ['read' => false]
            );
        }

        // Audit logs
        $adminUser = User::where('email', 'admin@arooth.sa')->first();
        if ($adminUser) {
            AuditLog::firstOrCreate(
                ['user_id' => $adminUser->id, 'action' => 'category.visibility_toggled', 'model_type' => 'App\\Models\\Category', 'model_id' => 1],
                ['old_values' => ['is_visible' => true], 'new_values' => ['is_visible' => false], 'ip_address' => '127.0.0.1', 'user_agent' => 'Seeder']
            );
            if ($buyerUser) {
                AuditLog::firstOrCreate(
                    ['user_id' => $adminUser->id, 'action' => 'user.role_updated', 'model_type' => 'App\\Models\\User', 'model_id' => $buyerUser->id],
                    ['old_values' => ['role' => 'buyer'], 'new_values' => ['role' => 'buyer'], 'ip_address' => '127.0.0.1', 'user_agent' => 'Seeder']
                );
            }
        }

        // Demo Companies (seed after regions/cities/categories exist)
        Company::factory()->count(6)->create();
    }
}
