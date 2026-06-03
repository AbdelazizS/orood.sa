<?php

namespace Database\Seeders;

use App\Models\Bid;
use App\Models\Category;
use App\Models\City;
use App\Models\Conversation;
use App\Models\Favorite;
use App\Models\Message;
use App\Models\Product;
use App\Models\Region;
use App\Models\SavedSearch;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Local dev feed: phones, clothes, books, used food — with photos.
 * Hides other categories and clears previous demo listings.
 */
class LocalFocusedSeeder extends Seeder
{
    /** @var list<string> */
    private const VISIBLE_CATEGORY_SLUGS = [
        'electronics',
        'clothing',
        'books-education',
        'food-groceries',
    ];

    /** Electronics: only phones (Mobiles subcategory). */
    private const VISIBLE_ELECTRONICS_SUBCAT_NAMES = ['Mobiles'];

    public function run(): void
    {
        $this->ensureDemoUsers();
        $this->applyCategoryVisibility();
        $this->purgeListings();
        $this->seedListings();
        Cache::forget('api.categories');
        $this->command?->info('Local focused demo: phones, clothes, books, used food (other categories hidden).');
    }

    private function ensureDemoUsers(): void
    {
        $users = [
            ['email' => 'super@arooth.sa', 'name' => 'Super Admin', 'phone' => '966500000099', 'role' => 'super_admin'],
            ['email' => 'admin@arooth.sa', 'name' => 'Admin', 'phone' => '966500000001', 'role' => 'admin'],
            ['email' => 'manager@arooth.sa', 'name' => 'Manager', 'phone' => '966500000002', 'role' => 'manager'],
            ['email' => 'demo@arooth.sa', 'name' => 'Demo Seller', 'phone' => '966500000000', 'role' => 'seller'],
            ['email' => 'buyer@arooth.sa', 'name' => 'Demo Buyer', 'phone' => '966500000003', 'role' => 'buyer'],
            ['email' => 'seller2@arooth.sa', 'name' => 'Second Seller', 'phone' => '966500000004', 'role' => 'seller'],
        ];

        foreach ($users as $row) {
            User::firstOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'role' => $row['role'],
                    'password' => bcrypt('password'),
                ],
            );
        }
    }

    private function applyCategoryVisibility(): void
    {
        Category::query()->update(['is_active' => false]);
        Category::query()
            ->whereIn('slug', self::VISIBLE_CATEGORY_SLUGS)
            ->update(['is_active' => true]);

        $electronics = Category::where('slug', 'electronics')->first();
        if ($electronics) {
            Subcategory::query()
                ->where('category_id', $electronics->id)
                ->update(['is_active' => false]);
            Subcategory::query()
                ->where('category_id', $electronics->id)
                ->whereIn('name', self::VISIBLE_ELECTRONICS_SUBCAT_NAMES)
                ->update(['is_active' => true]);
        }

        Subcategory::query()
            ->whereHas('category', fn ($q) => $q->whereIn('slug', ['clothing', 'books-education', 'food-groceries']))
            ->update(['is_active' => true]);
    }

    private function purgeListings(): void
    {
        Message::query()->delete();
        Conversation::query()->delete();
        Bid::query()->delete();
        Favorite::query()->delete();
        SavedSearch::query()->delete();
        Product::query()->delete();
    }

    private function seedListings(): void
    {
        $seller = User::where('email', 'demo@arooth.sa')->first();
        $seller2 = User::where('email', 'seller2@arooth.sa')->first();
        $buyer = User::where('email', 'buyer@arooth.sa')->first();

        if (! $seller) {
            return;
        }

        $products = [
            // Phones
            [
                'title' => 'iPhone 14 Pro مستعمل',
                'description' => 'بطارية 89%، بدون خدوش، مع الكرتون والشاحن الأصلي.',
                'price' => 3200,
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
                'accept_bids' => true,
                'seller' => 'demo',
            ],
            [
                'title' => 'Samsung Galaxy S23 Ultra مستعمل',
                'description' => 'استخدام 5 أشهر، ضمان متبقي 7 أشهر.',
                'price' => 2900,
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80',
                'seller' => 'seller2',
            ],
            [
                'title' => 'Xiaomi Redmi Note 12 مستعمل',
                'description' => 'شاشة سليمة، مناسب كجهاز ثانوي أو للأطفال.',
                'price' => 450,
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Eastern Province',
                'city' => 'Dammam',
                'image_url' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
            ],
            [
                'title' => 'Huawei P60 Pro مستعمل',
                'description' => 'كاميرا ممتازة، استخدام خفيف.',
                'price' => 2100,
                'category' => 'Electronics',
                'subcategory' => 'Mobiles',
                'region' => 'Riyadh',
                'city' => 'Diriyah',
                'image_url' => 'https://images.unsplash.com/photo-1598327275664-50b6b4b1ab0a?w=800&q=80',
                'accept_bids' => true,
                'seller' => 'seller2',
            ],
            // Clothing
            [
                'title' => 'ثوب سعودي مستعمل — مقاس 56',
                'description' => 'قماش فاخر، نظيف، بدون بقع.',
                'price' => 180,
                'category' => 'Clothing',
                'subcategory' => 'Men',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
            ],
            [
                'title' => 'فستان سهرة مستعمل',
                'description' => 'لُبس مرة واحدة، مقاس M.',
                'price' => 350,
                'category' => 'Clothing',
                'subcategory' => 'Women',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
                'seller' => 'seller2',
            ],
            [
                'title' => 'جاكيت شتوي مستعمل',
                'description' => 'ماركة عالمية، حالة جيدة جداً.',
                'price' => 120,
                'category' => 'Clothing',
                'subcategory' => 'Men',
                'region' => 'Eastern Province',
                'city' => 'Khobar',
                'image_url' => 'https://images.unsplash.com/photo-1551028713-8a5315447510?w=800&q=80',
            ],
            [
                'title' => 'حذاء رياضي Nike مستعمل',
                'description' => 'مقاس 43، نعل سليم.',
                'price' => 220,
                'category' => 'Clothing',
                'subcategory' => 'Accessories',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
            ],
            // Books
            [
                'title' => 'كتب ثانوية عامة مستعملة',
                'description' => 'مجموعة 12 كتاب — فيزياء، كيمياء، أحياء.',
                'price' => 90,
                'category' => 'Books & Education',
                'subcategory' => 'Books',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80',
            ],
            [
                'title' => 'روايات عربية مستعملة',
                'description' => '8 روايات، حالة مقبولة إلى جيدة.',
                'price' => 60,
                'category' => 'Books & Education',
                'subcategory' => 'Books',
                'region' => 'Makkah',
                'city' => 'Makkah City',
                'image_url' => 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
                'seller' => 'seller2',
            ],
            [
                'title' => 'كتب برمجة Python مستعملة',
                'description' => 'إنجليزي، بدون تمارين مكتوبة.',
                'price' => 75,
                'category' => 'Books & Education',
                'subcategory' => 'Books',
                'region' => 'Eastern Province',
                'city' => 'Dammam',
                'image_url' => 'https://images.unsplash.com/photo-1532012197267-da84d127e329?w=800&q=80',
            ],
            // Used / surplus food
            [
                'title' => 'تمر سكري فاخر — فائض مناسبة',
                'description' => 'كرتون 5 كيلو، مغلق، تاريخ صلاحية بعيد.',
                'price' => 85,
                'category' => 'Food & Groceries',
                'subcategory' => 'Snacks',
                'region' => 'Riyadh',
                'city' => 'Riyadh City',
                'image_url' => 'https://images.unsplash.com/photo-1606313564200-e75d5e304d0e?w=800&q=80',
            ],
            [
                'title' => 'عسل سدر مستعمل جزئياً',
                'description' => 'عبوة 1 كيلو، متبقي 70%، تخزين جيد.',
                'price' => 140,
                'category' => 'Food & Groceries',
                'subcategory' => 'Snacks',
                'region' => 'Makkah',
                'city' => 'Jeddah',
                'image_url' => 'https://images.unsplash.com/photo-1587049353266-1a1e001cd6f5?w=800&q=80',
                'seller' => 'seller2',
            ],
            [
                'title' => 'مكسرات محمصة بالكيلو',
                'description' => 'فائض من تجهيزات، طازجة.',
                'price' => 55,
                'category' => 'Food & Groceries',
                'subcategory' => 'Snacks',
                'region' => 'Eastern Province',
                'city' => 'Dammam',
                'image_url' => 'https://images.unsplash.com/photo-1599599810769-bcde70377e4c?w=800&q=80',
            ],
            [
                'title' => 'خضار وفواكه مستعملة — تبرع للبيع',
                'description' => 'صناديق خضار مناسبة، استهلاك خلال يومين.',
                'price' => 25,
                'category' => 'Food & Groceries',
                'subcategory' => 'Fresh Produce',
                'region' => 'Riyadh',
                'city' => 'Diriyah',
                'image_url' => 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80',
            ],
        ];

        foreach ($products as $index => $data) {
            $category = Category::where('name', $data['category'])->first();
            $subcategory = Subcategory::where('name', $data['subcategory'])
                ->where('category_id', $category?->id)
                ->first();
            $region = Region::where('name', $data['region'])->first();
            $city = City::where('name', $data['city'])->first();

            $sellerUser = ($data['seller'] ?? 'demo') === 'seller2' ? $seller2 : $seller;
            $slug = Str::slug($data['title']).'-local-'.($index + 1);
            $imageUrl = $data['image_url'];
            $acceptBids = $data['accept_bids'] ?? false;

            $product = Product::create([
                'slug' => $slug,
                'title' => $data['title'],
                'description' => $data['description'],
                'price' => $data['price'],
                'condition' => 'used',
                'warranty' => null,
                'is_offer' => true,
                'type' => 'offer',
                'accept_bids' => $acceptBids,
                'bids_visible' => true,
                'category_id' => $category?->id,
                'subcategory_id' => $subcategory?->id,
                'region_id' => $region?->id,
                'city_id' => $city?->id,
                'user_id' => $sellerUser?->id ?? $seller->id,
                'image_url' => $imageUrl,
                'media' => [
                    'cover' => $imageUrl,
                    'gallery' => [$imageUrl],
                ],
                'contact_preferences' => ['phone' => true, 'messages' => true],
                'shipping_details' => [
                    'free_shipping' => false,
                    'free_return' => false,
                    'view_at_client' => true,
                ],
                'stats' => ['views' => 0, 'purchases' => 0, 'messages' => 0, 'orders' => 0],
                'status' => 'published',
                'moderation_status' => 'approved',
                'published_at' => now(),
            ]);

            if ($acceptBids && $buyer) {
                Bid::create([
                    'product_id' => $product->id,
                    'user_id' => $buyer->id,
                    'amount' => (float) $data['price'] * 0.92,
                    'message' => 'مهتم، هل السعر قابل للتفاوض؟',
                    'is_visible' => true,
                ]);
            }
        }

        if ($buyer) {
            Product::query()->limit(3)->get()->each(function (Product $p) use ($buyer) {
                Favorite::firstOrCreate(['user_id' => $buyer->id, 'product_id' => $p->id]);
            });
        }
    }
}
