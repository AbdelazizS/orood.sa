<?php

namespace Database\Seeders;

use App\Models\Bid;
use App\Models\Category;
use App\Models\City;
use App\Models\Company;
use App\Models\CompanyVideo;
use App\Models\CompanyVideoComment;
use App\Models\Conversation;
use App\Models\Favorite;
use App\Models\Message;
use App\Models\Product;
use App\Models\ProductRealEstateDetail;
use App\Models\SavedSearch;
use App\Models\SubscriberAdCredit;
use App\Models\SubscriberListing;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Local/demo marketplace data with a Saudi feel: real cities and districts (approximate coordinates),
 * market-level prices, Arabic copy. Business names are fictional.
 *
 * Real-estate listings carry lat/lng + district so /listings/map shows price pins;
 * a few are marked "awaiting_marketer" to show the grey "انتظار" pins.
 *
 * All demo users: password "password".
 *
 * Production-safe (APP_ENV=production): adds data on top of what exists and deletes nothing,
 * skips the demo staff accounts (super/admin/manager/employee), never changes the password of an
 * existing account, and gives new demo accounts SEED_DEMO_PASSWORD (required, min 10 chars).
 * Seeded listings have slugs starting with "seed-" so they are easy to find or remove later.
 */
class SaudiMarketplaceSeeder extends Seeder
{
    private const IMG = 'https://images.unsplash.com/photo-';

    /** District centres (approximate) — city name => [district => [lat, lng]] */
    private const DISTRICTS = [
        'Riyadh City' => [
            'النرجس' => [24.8436, 46.6440],
            'الملقا' => [24.8090, 46.6100],
            'حطين' => [24.7650, 46.6000],
            'الياسمين' => [24.8250, 46.6550],
            'العارض' => [24.8700, 46.6100],
            'القيروان' => [24.8500, 46.5900],
            'الصحافة' => [24.8050, 46.6400],
            'الربيع' => [24.7950, 46.6650],
            'السليمانية' => [24.7050, 46.6950],
            'العليا' => [24.6950, 46.6850],
            'الرمال' => [24.8400, 46.8300],
            'المونسية' => [24.8250, 46.7750],
            'طويق' => [24.5900, 46.5600],
            'الملز' => [24.6650, 46.7350],
        ],
        'Jeddah' => [
            'الشاطئ' => [21.5900, 39.1100],
            'الروضة' => [21.5600, 39.1500],
            'أبحر الشمالية' => [21.7600, 39.1200],
            'الحمراء' => [21.5150, 39.1650],
            'السلامة' => [21.5850, 39.1600],
            'النعيم' => [21.6050, 39.1500],
            'المحمدية' => [21.6300, 39.1450],
        ],
        'Dammam' => [
            'الشاطئ' => [26.4650, 50.0850],
            'الفيصلية' => [26.4000, 50.0700],
            'النور' => [26.3950, 50.0300],
        ],
        'Khobar' => [
            'العقربية' => [26.2900, 50.2000],
            'الراكة' => [26.3500, 50.1950],
            'الحزام الذهبي' => [26.2700, 50.2100],
        ],
        'Makkah City' => [
            'العزيزية' => [21.4000, 39.8650],
            'الشوقية' => [21.3700, 39.8000],
        ],
        'Madinah City' => [
            'قباء' => [24.4400, 39.6200],
            'العزيزية' => [24.4300, 39.5750],
        ],
        'Abha' => [
            'المنسك' => [18.2200, 42.5050],
        ],
        'Al Kharj' => [
            'السيح' => [24.1500, 47.3100],
        ],
    ];

    /** Demo staff accounts — never created on production; the site's real admin is used instead. */
    private const STAFF_KEYS = ['super', 'admin', 'manager', 'employee'];

    /** @var array<string, User> */
    private array $users = [];

    public function run(): void
    {
        $this->seedUsers();
        $this->seedCompanies();

        $realEstate = $this->seedRealEstate();
        $other = $this->seedOtherListings();

        $this->seedActivity(array_merge($realEstate, $other));
        $this->seedSubscriber();
        $this->seedCompanyVideos();

        Cache::forget('homepage_feed');
        foreach (City::query()->pluck('id') as $cityId) {
            Cache::forget("listings_map_districts_{$cityId}");
        }
    }

    private function seedUsers(): void
    {
        $rows = [
            'super' => ['super@arooth.sa', 'مدير النظام', 'super_admin', '966500000099', 'Riyadh City'],
            'admin' => ['admin@arooth.sa', 'إدارة عروض', 'admin', '966500000001', 'Riyadh City'],
            'manager' => ['manager@arooth.sa', 'مدير المنصة', 'manager', '966500000002', 'Riyadh City'],
            'demo' => ['demo@arooth.sa', 'أحمد العتيبي', 'seller', '966500000000', 'Riyadh City'],
            'seller2' => ['seller2@arooth.sa', 'فهد القحطاني', 'seller', '966500000004', 'Riyadh City'],
            'buyer' => ['buyer@arooth.sa', 'سارة الغامدي', 'buyer', '966500000003', 'Jeddah'],
            'rakaez' => ['rakaez@arooth.sa', 'مكتب ركائز العقارية', 'company', '966500000010', 'Riyadh City'],
            'ofuq' => ['ofuq@arooth.sa', 'مؤسسة أفق الساحل للعقار', 'company', '966500000011', 'Jeddah'],
            'sharqiya' => ['sharqiya@arooth.sa', 'دار الشرقية للعقار', 'company', '966500000012', 'Khobar'],
            'cars' => ['cars@arooth.sa', 'معرض النخبة للسيارات', 'company', '966500000013', 'Riyadh City'],
            'abdullah' => ['abdullah@arooth.sa', 'عبدالله الشهري', 'seller', '966500000014', 'Abha'],
            'noura' => ['noura@arooth.sa', 'نورة الدوسري', 'seller', '966500000015', 'Dammam'],
            'marketer' => ['marketer@arooth.sa', 'خالد الزهراني', 'marketer', '966500000016', 'Riyadh City'],
            'employee' => ['employee@arooth.sa', 'ريم الحربي', 'employee', '966500000017', 'Riyadh City'],
            'subscriber' => ['subscriber@arooth.sa', 'مسوق مشترك', 'subscriber', '966500000018', 'Riyadh City'],
        ];

        // Readable public profile links for the company channels (/profile/rakaez …).
        $usernames = ['rakaez' => 'rakaez', 'ofuq' => 'ofuq', 'sharqiya' => 'sharqiya', 'cars' => 'alnokhba-cars'];

        $production = app()->environment('production');
        $password = 'password';
        if ($production) {
            $password = (string) env('SEED_DEMO_PASSWORD', '');
            if (strlen($password) < 10) {
                throw new \RuntimeException('Set SEED_DEMO_PASSWORD (at least 10 characters) in .env before seeding demo data on production.');
            }
            $staff = User::query()->whereIn('role', ['super_admin', 'admin'])->orderBy('id')->first();
            if (! $staff) {
                throw new \RuntimeException('Create the real admin first (php artisan admin:create) — demo staff accounts are not seeded on production.');
            }
        }

        foreach ($rows as $key => [$email, $name, $role, $phone, $cityName]) {
            if ($production && in_array($key, self::STAFF_KEYS, true)) {
                $this->users[$key] = $staff;

                continue;
            }

            $city = City::query()->where('name', $cityName)->first();
            $user = User::query()->firstOrNew(['email' => $email]);
            if ($production && $user->exists) {
                // Never touch a live account that happens to share a demo email.
                $this->users[$key] = $user;

                continue;
            }
            $user->fill([
                'name' => $name,
                'phone' => $phone,
                'role' => $role,
                'city_id' => $city?->id,
            ]);
            $user->forceFill(['password' => bcrypt($password), 'email_verified_at' => now()])->save();
            $this->users[$key] = $user;

            if (isset($usernames[$key]) && ! User::query()->where('username', $usernames[$key])->whereKeyNot($user->id)->exists()) {
                $user->forceFill(['username' => $usernames[$key]])->save();
            }
        }
    }

    private function seedCompanies(): void
    {
        $realEstate = Category::query()->where('slug', 'real-estate')->first();
        $cars = Category::query()->where('slug', 'cars')->first();

        $rows = [
            ['rakaez', 'مكتب ركائز العقارية', $realEstate, 'Riyadh City', 24.8250, 46.6550, 'تسويق وإدارة الأملاك السكنية والتجارية في شمال الرياض.', ['marketer', 'seller']],
            ['ofuq', 'مؤسسة أفق الساحل للعقار', $realEstate, 'Jeddah', 21.5900, 39.1100, 'وساطة عقارية وبيع شقق وفلل في شمال جدة.', ['marketer']],
            ['sharqiya', 'دار الشرقية للعقار', $realEstate, 'Khobar', 26.2900, 50.2000, 'تطوير وبيع عقارات سكنية وتجارية في الخبر والدمام والظهران.', ['developer', 'seller']],
            ['cars', 'معرض النخبة للسيارات', $cars, 'Riyadh City', 24.7300, 46.7900, 'سيارات مستعملة مفحوصة مع ضمان المعرض.', ['seller']],
        ];

        foreach ($rows as [$userKey, $name, $category, $cityName, $lat, $lng, $description, $activities]) {
            $city = City::query()->where('name', $cityName)->first();
            Company::updateOrCreate(
                ['user_id' => $this->users[$userKey]->id],
                [
                    'name' => $name,
                    'slug' => 'company-'.$userKey,
                    'category_id' => $category?->id,
                    'region_id' => $city?->region_id,
                    'city_id' => $city?->id,
                    'email' => $this->users[$userKey]->email,
                    'phone' => $this->users[$userKey]->phone,
                    'verification_status' => 'approved',
                    'activities' => $activities,
                    'fal_license_no' => '1100'.str_pad((string) $this->users[$userKey]->id, 6, '0', STR_PAD_LEFT),
                    'rating' => 4.6,
                    'description' => $description,
                    'lat' => $lat,
                    'lng' => $lng,
                ],
            );
        }
    }

    /**
     * @return list<Product>
     */
    private function seedRealEstate(): array
    {
        $villa = ['1613490493576-7fde63acd811', '1600596542815-ffad4c1539a9', '1580587771525-78b9dba3b914', '1512917774080-9991f1c4c750', '1564013799919-ab600027ffc6', '1570129477492-45c003edd2be', '1582407947304-fd86f028f716'];
        $villaInside = ['1600607687939-ce8a6c25118c', '1600566753190-17f0baa2a6c3'];
        $apartment = ['1502672260266-1c1ef2d93688', '1560448204-e02f11c3d0e2', '1545324418-cc1a3fa10c00', '1484154218962-a197022b5858', '1554995207-c18c203602cb', '1567401893414-76b7b1e5a7a5'];
        $land = ['1500382017468-9049fed747ef', '1541888946425-d81bb19240f5'];
        $building = ['1486406146926-c627a92ad1ab', '1546412414-e1885259563a'];
        $shop = ['1441986300917-64674bd600d8'];
        $farm = ['1625246333195-78d9c38ad449', '1500382017468-9049fed747ef'];

        // [title, description, city, district, purpose, type, price, area, beds, baths, street_width, age, images, seller, awaiting]
        $rows = [
            ['فيلا درج داخلي للبيع في حي النرجس', 'فيلا مودرن درج داخلي، 5 غرف نوم ماستر، مجلس رجال ومجلس نساء، صالة، مطبخ راكب، ملحق خارجي وغرفة سائق. الواجهة شمالية على شارع 20م. قريبة من طريق الملك سلمان.', 'Riyadh City', 'النرجس', 'sale', 'villa', 2350000, 360, 5, 6, 20, 1, [$villa[0], $villaInside[0]], 'rakaez', false],
            ['فيلا مع مسبح للبيع - حي الملقا', 'فيلا فاخرة بمسبح خارجي وحديقة، 6 غرف، تشطيب سوبر لوكس، تكييف مركزي، مصعد، واجهة جنوبية شرقية.', 'Riyadh City', 'الملقا', 'sale', 'villa', 3850000, 450, 6, 7, 25, 3, [$villa[1], $villaInside[1]], 'rakaez', false],
            ['فيلا دورين وملحق للبيع في حطين', 'فيلا دورين وملحق علوي، مساحة 400م، قريبة من الخدمات والمدارس العالمية، صك إلكتروني.', 'Riyadh City', 'حطين', 'sale', 'villa', 3200000, 400, 5, 6, 15, 6, [$villa[2]], 'demo', false],
            ['فيلا للبيع في الياسمين - تحتاج مسوق', 'فيلا درج صالة على زاوية، 4 غرف نوم، مجلس، صالة طعام، مطبخ مجهز. المالك يرغب بتسويقها عن طريق مسوق معتمد.', 'Riyadh City', 'الياسمين', 'sale', 'villa', 2650000, 375, 4, 5, 30, 4, [$villa[3]], 'seller2', true],
            ['شقة 4 غرف للبيع في حي العارض', 'شقة أرضية مع حوش خاص، 4 غرف، صالة، مطبخ، 3 دورات مياه، مدخل مستقل، موقف خاص.', 'Riyadh City', 'العارض', 'sale', 'apartment', 820000, 190, 4, 3, 15, 1, [$apartment[0], $apartment[3]], 'rakaez', false],
            ['شقة تمليك للبيع في القيروان', 'شقة دور أول، 3 غرف نوم، صالة واسعة، مطبخ، ضمانات على السباكة والكهرباء، بالقرب من طريق الملك فهد.', 'Riyadh City', 'القيروان', 'sale', 'apartment', 735000, 165, 3, 3, 15, 2, [$apartment[1]], 'demo', false],
            ['شقة للإيجار السنوي في الصحافة', 'شقة عوائل 3 غرف وصالة ومطبخ راكب، مكيفات سبليت، دفعتين في السنة.', 'Riyadh City', 'الصحافة', 'rent', 'apartment', 58000, 150, 3, 2, 12, 5, [$apartment[4]], 'rakaez', false],
            ['شقة مؤثثة للإيجار في الربيع', 'شقة مؤثثة بالكامل غرفتين وصالة، مناسبة للموظفين، قريبة من طريق أبو بكر الصديق.', 'Riyadh City', 'الربيع', 'rent', 'apartment', 52000, 110, 2, 2, 15, 3, [$apartment[2]], 'seller2', false],
            ['أرض سكنية للبيع في النرجس', 'أرض سكنية زاوية على شارعين 20م و15م، مساحة 625م، منطقة مخدومة بالكامل.', 'Riyadh City', 'النرجس', 'sale', 'land', 1875000, 625, null, null, 20, null, [$land[0]], 'rakaez', false],
            ['أرض للبيع في الرمال - تحتاج مسوق', 'أرض سكنية 900م شرق الرياض، قريبة من الطريق الدائري الشرقي، صك جاهز. المالك يطلب مسوق.', 'Riyadh City', 'الرمال', 'sale', 'land', 1260000, 900, null, null, 30, null, [$land[1]], 'demo', true],
            ['عمارة سكنية للبيع في الملز', 'عمارة 3 أدوار، 9 شقق مؤجرة بالكامل، دخل سنوي ممتاز، قريبة من جامعة الملك سعود سابقاً.', 'Riyadh City', 'الملز', 'sale', 'building', 5400000, 750, null, null, 20, 15, [$building[0]], 'rakaez', false],
            ['محل تجاري للإيجار على طريق العليا', 'محل تجاري واجهة زجاج 12م على شارع تجاري، مناسب للكافيهات والملابس، عداد كهرباء مستقل.', 'Riyadh City', 'العليا', 'rent', 'shop', 145000, 120, null, 1, 40, 8, [$shop[0]], 'seller2', false],
            ['دور علوي للبيع في المونسية', 'دور علوي مع سطح خاص، 4 غرف، مدخل مستقل، تشطيب جديد.', 'Riyadh City', 'المونسية', 'sale', 'floor', 690000, 210, 4, 3, 15, 2, [$apartment[5]], 'demo', false],
            ['فيلا للبيع في طويق', 'فيلا درج صالة بسعر مناسب، 5 غرف، ملحق، بالقرب من طريق نجران.', 'Riyadh City', 'طويق', 'sale', 'villa', 1480000, 312, 5, 5, 15, 7, [$villa[4]], 'seller2', false],
            ['شقة للبيع في السليمانية', 'شقة فاخرة دور ثالث مع مصعد، 3 غرف، قريبة من مركز المملكة.', 'Riyadh City', 'السليمانية', 'sale', 'apartment', 1150000, 175, 3, 3, 20, 4, [$apartment[3]], 'rakaez', false],

            ['شقة بإطلالة بحرية للبيع في الشاطئ', 'شقة على الكورنيش بإطلالة مباشرة على البحر، 3 غرف، صالة، مواقف قبو، حراسة.', 'Jeddah', 'الشاطئ', 'sale', 'apartment', 1450000, 200, 3, 3, 30, 3, [$apartment[2], $apartment[4]], 'ofuq', false],
            ['فيلا للبيع في أبحر الشمالية', 'فيلا مع مسبح وحديقة، قريبة من الشاطئ، 5 غرف ماستر، ملحق خارجي.', 'Jeddah', 'أبحر الشمالية', 'sale', 'villa', 2900000, 500, 5, 6, 20, 5, [$villa[5]], 'ofuq', false],
            ['شقة للإيجار في الروضة', 'شقة عوائل 4 غرف، قريبة من شارع صاري، دفعات ميسرة.', 'Jeddah', 'الروضة', 'rent', 'apartment', 48000, 170, 4, 2, 15, 9, [$apartment[0]], 'ofuq', false],
            ['شقة للبيع في السلامة - تحتاج مسوق', 'شقة 5 غرف دور ثاني، مطبخ راكب، مدخلين. المالك يرغب في تسويقها عن طريق مسوق.', 'Jeddah', 'السلامة', 'sale', 'apartment', 780000, 230, 5, 3, 15, 6, [$apartment[1]], 'buyer', true],
            ['أرض تجارية للبيع في المحمدية', 'أرض تجارية على شارع 40م، مناسبة لمعارض ومكاتب.', 'Jeddah', 'المحمدية', 'sale', 'land', 4200000, 1200, null, null, 40, null, [$land[0]], 'ofuq', false],
            ['دور للبيع في النعيم', 'دور أرضي 5 غرف مع مدخل خاص، قريب من طريق الملك عبدالعزيز.', 'Jeddah', 'النعيم', 'sale', 'floor', 860000, 260, 5, 4, 15, 4, [$apartment[5]], 'ofuq', false],
            ['محل للإيجار في الحمراء', 'محل على شارع فلسطين بالقرب من الإشارة، واجهة 8م.', 'Jeddah', 'الحمراء', 'rent', 'shop', 95000, 80, null, 1, 30, 10, [$shop[0]], 'buyer', false],

            ['فيلا للبيع في الشاطئ - الدمام', 'فيلا درج داخلي قريبة من الكورنيش، 5 غرف، مجلس، ملحق.', 'Dammam', 'الشاطئ', 'sale', 'villa', 1950000, 400, 5, 5, 20, 3, [$villa[6]], 'sharqiya', false],
            ['شقة للإيجار في الفيصلية', 'شقة 3 غرف للعوائل، قريبة من الخدمات والمدارس.', 'Dammam', 'الفيصلية', 'rent', 'apartment', 32000, 140, 3, 2, 12, 8, [$apartment[1]], 'noura', false],
            ['أرض للبيع في النور - تحتاج مسوق', 'أرض سكنية 600م على شارع 18م، المالك يحتاج مسوق لتسويق الأرض.', 'Dammam', 'النور', 'sale', 'land', 720000, 600, null, null, 18, null, [$land[1]], 'noura', true],
            ['شقة فاخرة للبيع في العقربية', 'شقة جديدة 4 غرف، مطبخ مجهز، مصعد، قريبة من شارع الأمير تركي.', 'Khobar', 'العقربية', 'sale', 'apartment', 980000, 200, 4, 3, 20, 1, [$apartment[3]], 'sharqiya', false],
            ['فيلا للإيجار في الراكة', 'فيلا عوائل مع حديقة، 5 غرف، قريبة من جامعة الملك فهد للبترول.', 'Khobar', 'الراكة', 'rent', 'villa', 120000, 420, 5, 5, 15, 6, [$villa[2]], 'sharqiya', false],
            ['عمارة تجارية للبيع في الحزام الذهبي', 'عمارة تجارية سكنية، معارض أرضية وشقق علوية مؤجرة.', 'Khobar', 'الحزام الذهبي', 'sale', 'building', 8700000, 1100, null, null, 30, 12, [$building[1]], 'sharqiya', false],

            ['شقة للإيجار في العزيزية - مكة', 'شقة مفروشة 3 غرف قريبة من الحرم، مناسبة للعوائل.', 'Makkah City', 'العزيزية', 'rent', 'apartment', 60000, 130, 3, 2, 20, 5, [$apartment[4]], 'demo', false],
            ['أرض للبيع في الشوقية', 'أرض سكنية 500م، صك إلكتروني، قريبة من الطريق الدائري الثالث.', 'Makkah City', 'الشوقية', 'sale', 'land', 1100000, 500, null, null, 20, null, [$land[0]], 'seller2', true],
            ['فيلا للبيع في قباء', 'فيلا قريبة من مسجد قباء، 6 غرف، ملحق، موقع هادئ.', 'Madinah City', 'قباء', 'sale', 'villa', 2100000, 450, 6, 6, 15, 8, [$villa[0]], 'demo', false],
            ['شقة للبيع في العزيزية - المدينة', 'شقة 3 غرف دور أول، قريبة من الخدمات.', 'Madinah City', 'العزيزية', 'sale', 'apartment', 560000, 150, 3, 2, 15, 4, [$apartment[0]], 'seller2', false],
            ['فيلا بإطلالة جبلية للبيع في أبها', 'فيلا في حي المنسك بإطلالة على الجبال وجو معتدل صيفاً، 5 غرف.', 'Abha', 'المنسك', 'sale', 'villa', 1650000, 380, 5, 5, 15, 5, [$villa[3]], 'abdullah', false],
            ['مزرعة للبيع في الخرج', 'مزرعة 10 آلاف متر، بئر ارتوازي، نخيل منتج (سكري وخلاص)، استراحة ومجلس.', 'Al Kharj', 'السيح', 'sale', 'farm', 2600000, 10000, null, 2, 12, 10, [$farm[0], $farm[1]], 'abdullah', false],
        ];

        $category = Category::query()->where('slug', 'real-estate')->firstOrFail();
        $subByType = Subcategory::query()->where('category_id', $category->id)->get()->keyBy('listing_property_type');

        $products = [];
        foreach ($rows as $i => [$title, $description, $cityName, $district, $purpose, $type, $price, $area, $beds, $baths, $street, $age, $images, $sellerKey, $awaiting]) {
            $city = City::query()->where('name', $cityName)->firstOrFail();
            [$lat, $lng] = self::DISTRICTS[$cityName][$district];
            // Spread pins in the same district so they don't stack.
            $lat += ((($i * 37) % 11) - 5) * 0.0011;
            $lng += ((($i * 53) % 13) - 6) * 0.0011;

            $product = $this->upsertProduct($i, 're', [
                'title' => $title,
                'description' => $description,
                'price' => $price,
                'condition' => $age !== null && $age <= 1 ? 'new' : 'used',
                'category_id' => $category->id,
                'subcategory_id' => $subByType[$type]->id ?? null,
                'city_id' => $city->id,
                'region_id' => $city->region_id,
                'user_id' => $this->users[$sellerKey]->id,
                'images' => array_map(fn ($id) => self::IMG.$id.'?w=1200&q=80', $images),
                'location_lat' => round($lat, 6),
                'location_lng' => round($lng, 6),
                'location_address' => $district.'، '.$city->name_ar,
                'district' => $district,
                'ad_license_no' => '72'.str_pad((string) (10000000 + $i * 7919), 8, '0', STR_PAD_LEFT),
                'marketing_status' => $awaiting ? Product::MARKETING_AWAITING : null,
                'accept_bids' => $purpose === 'sale' && $i % 3 === 0 && ! $awaiting,
                'view_at_location' => true,
            ]);

            ProductRealEstateDetail::updateOrCreate(
                ['product_id' => $product->id],
                [
                    'purpose' => $purpose,
                    'property_type' => $type,
                    'area_sqm' => $area,
                    'bedrooms' => $beds,
                    'bathrooms' => $baths,
                    'land_width_m' => $type === 'land' ? round(sqrt($area * 0.8), 1) : null,
                    'land_length_m' => $type === 'land' ? round($area / sqrt($area * 0.8), 1) : null,
                    'street_width_m' => $street,
                    'property_age_years' => $age,
                    'furnished' => $purpose === 'rent' && in_array($district, ['الربيع', 'العزيزية'], true),
                    'amenities' => in_array($type, ['villa', 'apartment', 'floor'], true)
                        ? ['parking', 'air_conditioning', 'kitchen']
                        : [],
                ],
            );

            $products[] = $product;
        }

        return $products;
    }

    /**
     * @return list<Product>
     */
    private function seedOtherListings(): array
    {
        // [title, description, category slug, subcategory slug, price, condition, city, seller, images, type, accept_bids]
        $rows = [
            ['تويوتا لاندكروزر GXR 2021 فل كامل', 'لاندكروزر 2021 جي اكس ار، ممشى 85 ألف كم، سيرفس الوكالة، بدون حوادث، فحص دوري ساري.', 'cars', 'cars-cars', 265000, 'used', 'Riyadh City', 'cars', ['1621007947382-bb3c3994e3fb'], 'offer', true],
            ['تويوتا كامري 2022 جراند', 'كامري جراند 2022، ممشى 48 ألف، لون لؤلؤي، تأمين شامل حتى نهاية السنة.', 'cars', 'cars-cars', 98000, 'used', 'Riyadh City', 'cars', ['1549317661-bd32c8ce0db2'], 'offer', false],
            ['هيونداي سوناتا 2023 للبيع', 'سوناتا 2023 نظيفة جداً، ممشى 30 ألف، ضمان الوكيل ساري.', 'cars', 'cars-cars', 89000, 'used', 'Jeddah', 'buyer', ['1494976388531-d1058494cdd8'], 'offer', true],
            ['نيسان باترول بلاتينيوم 2020', 'باترول بلاتينيوم 2020، صيانة دورية، كفرات جديدة، بدون رش.', 'cars', 'cars-cars', 175000, 'used', 'Dammam', 'cars', ['1533473359331-0135ef1b58bf'], 'offer', false],
            ['جمس يوكن دينالي 2019', 'يوكن دينالي 2019 فل كامل، فتحة سقف، شاشات خلفية.', 'cars', 'cars-cars', 135000, 'used', 'Riyadh City', 'seller2', ['1542362567-b07e54358753'], 'offer', true],
            ['دباب هارلي ديفيدسون 2018', 'دباب هارلي 2018 بحالة الوكالة، ممشى 12 ألف ميل.', 'cars', 'cars-motorcycles', 52000, 'used', 'Khobar', 'noura', ['1558981806-ec527fa84c39'], 'offer', false],

            ['آيفون 15 برو ماكس 256 قيقا', 'آيفون 15 برو ماكس تيتانيوم طبيعي، بطارية 96%، مع الكرتون والملحقات، ضمان أبل ساري.', 'electronics', 'electronics-mobiles', 4300, 'used', 'Riyadh City', 'demo', ['1695048133142-1a20484d2569', '1592750475338-74b7b21085ab'], 'offer', true],
            ['سامسونج جالكسي S24 ألترا', 'جالكسي S24 ألترا 512 قيقا، استخدام شهرين، مع الشاحن الأصلي.', 'electronics', 'electronics-mobiles', 3900, 'used', 'Jeddah', 'seller2', ['1610945415295-d9bbf067e59c'], 'offer', false],
            ['ماك بوك آير M2 للبيع', 'ماك بوك آير M2 رام 8 قيقا، تخزين 256، دورات البطارية 60 فقط.', 'electronics', 'electronics-laptops', 3200, 'used', 'Dammam', 'noura', ['1517336714731-489689fd1ca8'], 'offer', false],
            ['لابتوب ألعاب RTX 4060', 'لابتوب ألعاب بمعالج i7 الجيل 13 وكرت RTX 4060، شاشة 165 هرتز.', 'electronics', 'electronics-laptops', 4800, 'used', 'Riyadh City', 'seller2', ['1541807084-5c52b6b3adef'], 'offer', true],
            ['بلايستيشن 5 مع يدتين', 'بلايستيشن 5 نسخة السي دي مع يدتين و3 ألعاب.', 'electronics', 'electronics-tvs', 1750, 'used', 'Abha', 'abdullah', ['1606144042614-b2417e99c4e3'], 'offer', true],
            ['شاشة سامسونج 65 بوصة 4K', 'شاشة سمارت 65 بوصة كريستال 4K، مع الريموت والقاعدة.', 'electronics', 'electronics-tvs', 2100, 'used', 'Riyadh City', 'demo', ['1593784991095-a205069470b6'], 'offer', false],

            ['كنب مجلس عربي 10 مقاعد', 'جلسة عربية مع مساند، قماش مخمل، استخدام سنة واحدة.', 'furniture', 'furniture-living-room', 3500, 'used', 'Riyadh City', 'demo', ['1555041469-a586c61ea9bc'], 'offer', false],
            ['غرفة نوم كاملة خشب زان', 'غرفة نوم مع دولاب 6 أبواب وتسريحة وكومودينات، بحالة ممتازة.', 'furniture', 'furniture-bedroom', 4200, 'used', 'Jeddah', 'buyer', ['1505693416388-ac5ce068fe85'], 'offer', false],
            ['مكتب وكرسي طبي للعمل من المنزل', 'مكتب خشب 140سم مع كرسي طبي قابل للتعديل.', 'furniture', 'furniture-office', 900, 'used', 'Khobar', 'noura', ['1524758631624-e2822e304c36'], 'offer', false],

            ['دهن عود كمبودي 3 تولة', 'دهن عود كمبودي فاخر، تعتيق 5 سنوات، مع شهادة المصدر.', 'health-beauty', 'health-beauty-fragrances', 1200, 'new', 'Makkah City', 'noura', ['1594035910387-fea47794261f'], 'offer', false],
            ['مجموعة عطور شرقية', 'مجموعة 4 عطور شرقية (عود، مسك، عنبر، ورد طائفي) جديدة بالتغليف.', 'health-beauty', 'health-beauty-fragrances', 650, 'new', 'Dammam', 'noura', ['1585386959984-a4155224a1ad'], 'offer', false],
            ['منتجات عناية بالبشرة', 'مجموعة عناية يومية جديدة غير مفتوحة، صلاحية حتى 2027.', 'health-beauty', 'health-beauty-skincare', 280, 'new', 'Riyadh City', 'noura', ['1556228578-8c89e6adf883'], 'offer', false],

            ['تمر سكري القصيم - كرتون 3 كيلو', 'تمر سكري مفتل من مزارع القصيم، موسم هذا العام، توصيل داخل الرياض.', 'food-groceries', 'food-groceries-fresh-produce', 95, 'new', 'Riyadh City', 'abdullah', ['1610832958506-aa56368176cf'], 'offer', false],
            ['عسل سدر جبلي من الباحة', 'عسل سدر طبيعي 1 كيلو، مفحوص، من مناحل الباحة.', 'food-groceries', 'food-groceries-snacks', 350, 'new', 'Abha', 'abdullah', ['1606220588913-b3aacb4d2f46'], 'offer', false],

            ['ثوب رجالي تفصيل جديد', 'ثوب شتوي تفصيل مقاس 56، قماش ياباني، لم يُلبس.', 'clothing', 'clothing-men', 220, 'new', 'Riyadh City', 'seller2', ['1594938298603-c8148c4dae35'], 'offer', false],
            ['حذاء رياضي أصلي مقاس 43', 'حذاء جري أصلي جديد بالكرتون مقاس 43.', 'clothing', 'clothing-accessories', 380, 'new', 'Jeddah', 'buyer', ['1542291026-7eec264c27ff'], 'offer', false],

            ['قطة شيرازي للتبني', 'قطة شيرازي عمر 6 أشهر، مطعمة ومعها جواز صحي.', 'pets', 'pets-cats', 800, 'used', 'Dammam', 'noura', ['1514888286974-6c03e2ca1dba'], 'offer', false],
            ['جهاز سير كهربائي', 'سير كهربائي قابل للطي، سرعة حتى 14 كم/س، استخدام خفيف.', 'sports-leisure', 'sports-leisure-fitness', 1400, 'used', 'Riyadh City', 'demo', ['1571019613454-1cb2f99b2d8b'], 'offer', true],
            ['كتب تحضير القدرات والتحصيلي', 'مجموعة كتب القدرات والتحصيلي العلمي، طبعة حديثة.', 'books-education', 'books-education-books', 120, 'used', 'Madinah City', 'seller2', ['1495446815901-a7297e633e8d'], 'offer', false],
            ['نقل عفش داخل الرياض مع الفك والتركيب', 'نقل عفش بعمالة مدربة وسيارات مغلقة، فك وتركيب وتغليف.', 'services', 'services-moving', 600, 'new', 'Riyadh City', 'demo', ['1441986300917-64674bd600d8'], 'offer', false],

            ['مطلوب شقة للإيجار في النرجس', 'أبحث عن شقة 3 غرف للإيجار السنوي في النرجس أو الياسمين، الميزانية حتى 60 ألف.', 'real-estate', 'real-estate-apartments', 60000, 'used', 'Riyadh City', 'buyer', ['1502672260266-1c1ef2d93688'], 'request', false],
            ['مطلوب كامري 2020 وأعلى', 'مطلوب كامري موديل 2020 أو أحدث، ممشى أقل من 100 ألف، الدفع كاش.', 'cars', 'cars-cars', 75000, 'used', 'Jeddah', 'buyer', ['1549317661-bd32c8ce0db2'], 'request', false],
        ];

        $products = [];
        foreach ($rows as $i => [$title, $description, $categorySlug, $subSlug, $price, $condition, $cityName, $sellerKey, $images, $type, $acceptBids]) {
            $category = Category::query()->where('slug', $categorySlug)->firstOrFail();
            $sub = Subcategory::query()->where('slug', $subSlug)->first();
            $city = City::query()->where('name', $cityName)->firstOrFail();

            $products[] = $this->upsertProduct($i, 'item', [
                'title' => $title,
                'description' => $description,
                'price' => $price,
                'condition' => $condition,
                'category_id' => $category->id,
                'subcategory_id' => $sub?->id,
                'city_id' => $city->id,
                'region_id' => $city->region_id,
                'user_id' => $this->users[$sellerKey]->id,
                'images' => array_map(fn ($id) => self::IMG.$id.'?w=1200&q=80', $images),
                'type' => $type,
                'accept_bids' => $acceptBids,
                'free_shipping' => in_array($categorySlug, ['health-beauty', 'books-education', 'clothing'], true),
            ]);
        }

        return $products;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function upsertProduct(int $index, string $prefix, array $data): Product
    {
        $images = $data['images'];
        $type = $data['type'] ?? 'offer';
        $publishedAt = now()->subHours(($index * 7) % 600 + 1);
        $views = 40 + (($index * 97) % 900);

        return Product::updateOrCreate(
            ['slug' => "seed-{$prefix}-".($index + 1).'-'.Str::slug(Str::limit($data['title'], 40, ''), '-', 'ar')],
            [
                'user_id' => $data['user_id'],
                'title' => $data['title'],
                'description' => $data['description'],
                'price' => $data['price'],
                'condition' => $data['condition'],
                'is_offer' => $type === 'offer',
                'type' => $type,
                'accept_bids' => (bool) ($data['accept_bids'] ?? false),
                'bids_visible' => true,
                'show_comments' => true,
                'category_id' => $data['category_id'],
                'subcategory_id' => $data['subcategory_id'],
                'region_id' => $data['region_id'],
                'city_id' => $data['city_id'],
                'image_url' => $images[0],
                'media' => ['cover' => $images[0], 'gallery' => $images],
                'contact_preferences' => ['phone' => true, 'messages' => true, 'phone_number' => User::find($data['user_id'])?->phone],
                'contact_by_call' => true,
                'contact_phone' => User::find($data['user_id'])?->phone,
                'shipping_details' => [
                    'free_shipping' => (bool) ($data['free_shipping'] ?? false),
                    'free_return' => false,
                    'return_days' => null,
                    'view_at_client' => (bool) ($data['view_at_location'] ?? false),
                ],
                'free_shipping' => (bool) ($data['free_shipping'] ?? false),
                'view_at_location' => (bool) ($data['view_at_location'] ?? false),
                'location_lat' => $data['location_lat'] ?? null,
                'location_lng' => $data['location_lng'] ?? null,
                'location_address' => $data['location_address'] ?? null,
                'district' => $data['district'] ?? null,
                'ad_license_no' => $data['ad_license_no'] ?? null,
                'marketing_status' => $data['marketing_status'] ?? null,
                'view_count' => $views,
                'today_view_count' => $views % 25,
                'stats' => ['views' => $views],
                'is_wholesale' => false,
                'status' => 'published',
                'moderation_status' => 'approved',
                'payout_activation_status' => 'active',
                'published_at' => $publishedAt,
                'bumped_at' => $publishedAt,
            ],
        );
    }

    /** Small free sample clips (downloaded once into storage; external link if the download fails). */
    private const SAMPLE_VIDEOS = [
        'tour-a' => 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'tour-b' => 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
        'tour-c' => 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
        'short-a' => 'https://download.samplelib.com/mp4/sample-5s.mp4',
        'short-b' => 'https://download.samplelib.com/mp4/sample-10s.mp4',
        'short-c' => 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    ];

    /**
     * @return array{0: ?string, 1: ?string} [video_path, video_url]
     */
    private function sampleVideo(string $key): array
    {
        $path = 'company-videos/demo/'.$key.'.mp4';
        $disk = Storage::disk('public');
        if ($disk->exists($path)) {
            return [$path, null];
        }
        try {
            $res = Http::timeout(40)->get(self::SAMPLE_VIDEOS[$key]);
            if ($res->successful() && strlen($res->body()) > 10000) {
                $disk->put($path, $res->body());

                return [$path, null];
            }
        } catch (\Throwable) {
            // Offline: fall back to the public link.
        }

        return [null, self::SAMPLE_VIDEOS[$key]];
    }

    /**
     * Company channels: long videos + Shorts linked to their listings, with YouTube-style comments
     * (pinned, hearted by the company, replies from the verified company, timestamps).
     */
    private function seedCompanyVideos(): void
    {
        $img = fn (string $id) => self::IMG.$id.'?w=960&q=75';
        $channels = [
            'rakaez' => [
                ['جولة كاملة داخل فيلا النرجس — درج داخلي 360م²', "جولة تفصيلية في الفيلا: المجالس، المطبخ، غرف النوم والملحق.\n\nللاستفسار عن السعر وطريقة الدفع اكتب تعليقاً أو راسلنا.", 'tour-a', false, 10, '1613490493576-7fde63acd811', 'النرجس'],
                ['فيلا الملقا مع مسبح — جولة سريعة في الحديقة', 'جولة في الحديقة والمسبح الخارجي وواجهة الفيلا.', 'tour-b', false, 10, '1600596542815-ffad4c1539a9', 'الملقا'],
                ['كيف تختار الحي المناسب في شمال الرياض؟', "نصائح مختصرة لاختيار الحي: القرب من الطرق، المدارس، والخدمات.\n\nشاركنا في التعليقات أي حي تفضل.", 'tour-c', false, 10, '1546412414-e1885259563a', null],
                ['مطبخ فيلا النرجس في 5 ثواني', 'لمحة سريعة عن المطبخ الراكب.', 'short-a', true, 5, '1600607687939-ce8a6c25118c', 'النرجس'],
                ['إطلالة السطح — حي العارض', 'السطح والحوش الخاص للشقة الأرضية.', 'short-b', true, 10, '1502672260266-1c1ef2d93688', 'العارض'],
                ['حديقة الفيلا وقت الغروب', 'لقطة قصيرة للحديقة.', 'short-c', true, 5, '1600566753190-17f0baa2a6c3', 'الملقا'],
            ],
            'ofuq' => [
                ['شقة بإطلالة بحرية على كورنيش جدة', 'جولة في الشقة والإطلالة المباشرة على البحر.', 'tour-b', false, 10, '1545324418-cc1a3fa10c00', 'الشاطئ'],
                ['فيلا أبحر الشمالية — جولة خارجية', 'المسبح والحديقة والملحق الخارجي.', 'tour-a', false, 10, '1580587771525-78b9dba3b914', 'أبحر الشمالية'],
                ['غروب الكورنيش من الشقة', 'لقطة قصيرة من الشرفة.', 'short-c', true, 5, '1554995207-c18c203602cb', 'الشاطئ'],
                ['مدخل العمارة والمواقف', 'لمحة سريعة.', 'short-a', true, 5, '1486406146926-c627a92ad1ab', null],
            ],
            'sharqiya' => [
                ['مشروعنا الجديد في الخبر — مرحلة البناء', 'تحديث عن مراحل التنفيذ في المشروع.', 'tour-c', false, 10, '1541888946425-d81bb19240f5', 'العقربية'],
                ['واجهة فيلا الدمام', 'لقطة قصيرة للواجهة.', 'short-b', true, 10, '1512917774080-9991f1c4c750', 'الشاطئ'],
            ],
            'cars' => [
                ['لاندكروزر 2021 — فحص كامل قبل البيع', 'نستعرض حالة السيارة والفحص والسيرفس.', 'tour-a', false, 10, '1621007947382-bb3c3994e3fb', null],
            ],
        ];

        $commenters = [$this->users['buyer'], $this->users['demo'], $this->users['seller2'], $this->users['abdullah']];

        foreach ($channels as $key => $videos) {
            $owner = $this->users[$key];
            $company = Company::query()->where('user_id', $owner->id)->first();
            if (! $company) {
                continue;
            }

            foreach ($videos as $i => [$title, $description, $sample, $isShort, $duration, $thumb, $district]) {
                [$path, $url] = $this->sampleVideo($sample);
                $product = $district
                    ? Product::query()->where('user_id', $owner->id)->where('district', $district)->first()
                    : null;
                $publishedAt = now()->subDays(($i * 3) + 1)->subHours($i * 5);

                $video = CompanyVideo::updateOrCreate(
                    ['company_id' => $company->id, 'title' => $title],
                    [
                        'user_id' => $owner->id,
                        'product_id' => $product?->id,
                        'description' => $description,
                        'video_path' => $path,
                        'video_url' => $url,
                        'thumbnail_url' => $img($thumb),
                        'duration_sec' => $duration,
                        'is_short' => $isShort,
                        'views_count' => 120 + (($i * 397) % 2400),
                        'status' => CompanyVideo::STATUS_PUBLISHED,
                        'published_at' => $publishedAt,
                    ],
                );

                if ($isShort || $video->comments()->exists()) {
                    $video->refreshCommentsCount();
                    continue;
                }

                // A short, realistic thread on each long video.
                $q = $video->comments()->create(['user_id' => $commenters[0]->id, 'body' => 'كم السعر؟ وهل يقبل التفاوض؟', 'likes_count' => 4]);
                $video->comments()->create(['user_id' => $owner->id, 'parent_id' => $q->id, 'body' => 'أهلاً بك، السعر موضح في الإعلان المرتبط تحت الفيديو، وقابل للتفاوض البسيط.']);
                $t = $video->comments()->create(['user_id' => $commenters[1]->id, 'body' => 'التشطيب عند 00:06 ممتاز 👌', 'timestamp_sec' => 6, 'owner_hearted' => true, 'likes_count' => 7]);
                $video->comments()->create(['user_id' => $commenters[2]->id, 'parent_id' => $t->id, 'body' => 'فعلاً، ما شاء الله.']);
                $pinned = $video->comments()->create([
                    'user_id' => $owner->id,
                    'body' => 'لحجز موعد معاينة راسلنا من زر «اسأل عن العقار» تحت الفيديو. 📍',
                    'is_pinned' => true,
                    'likes_count' => 12,
                ]);
                $video->comments()->create(['user_id' => $commenters[3]->id, 'body' => 'هل يوجد تمويل بنكي؟', 'likes_count' => 1]);
                $video->refreshCommentsCount();
                $video->update(['likes_count' => 30 + ($i * 11)]);
                unset($pinned);
            }
        }
    }

    /**
     * Demo subscriber: 10 ad credits, one awaiting listing already bought (with a short follow-up thread).
     */
    private function seedSubscriber(): void
    {
        $subscriber = $this->users['subscriber'];
        $admin = $this->users['admin'];

        if (! SubscriberAdCredit::query()->where('subscriber_id', $subscriber->id)->exists()) {
            SubscriberAdCredit::create([
                'subscriber_id' => $subscriber->id,
                'delta' => 10,
                'reason' => SubscriberAdCredit::REASON_PURCHASE,
                'created_by' => $admin->id,
                'note' => 'باقة تجريبية',
                'amount_sar' => 10 * (float) config('subscribers.ad_price_sar'),
            ]);
        }

        $listing = Product::query()->awaitingMarketer()->where('title', 'like', '%الياسمين%')->first();
        if (! $listing || SubscriberListing::query()->where('product_id', $listing->id)->exists()) {
            return;
        }

        SubscriberAdCredit::create([
            'subscriber_id' => $subscriber->id,
            'delta' => -1,
            'reason' => SubscriberAdCredit::REASON_USE,
            'product_id' => $listing->id,
            'amount_sar' => (float) config('subscribers.ad_price_sar'),
        ]);
        $row = SubscriberListing::create([
            'product_id' => $listing->id,
            'subscriber_id' => $subscriber->id,
            'purchased_at' => now()->subDays(2),
            'status' => SubscriberListing::STATUS_ACTIVE,
            'expires_at' => now()->subDays(2)->addDays((int) config('subscribers.ad_days')),
        ]);
        $listing->update(['marketing_status' => Product::MARKETING_MARKETED, 'bumped_at' => now()->subDays(2)]);

        $notes = [
            [$this->users['employee']->id, 'اتصل عميل اليوم (أبو فيصل) وطلب معاينة الفيلا يوم الخميس، رقمه عند الإدارة.', now()->subDay()],
            [$subscriber->id, 'تم، سأنسق المعاينة مع المالك.', now()->subHours(20)],
            [$admin->id, 'عميل آخر يسأل عن إمكانية التفاوض على السعر.', now()->subHours(3)],
        ];
        foreach ($notes as [$authorId, $body, $at]) {
            $note = $row->notes()->create(['author_id' => $authorId, 'body' => $body]);
            $note->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
        }
        $row->update(['last_note_at' => now()->subHours(3), 'last_note_by' => $admin->id]);
    }

    /**
     * @param  list<Product>  $products
     */
    private function seedActivity(array $products): void
    {
        $buyer = $this->users['buyer'];
        $marketer = $this->users['marketer'];

        $biddable = array_values(array_filter($products, fn (Product $p) => $p->accept_bids && $p->user_id !== $buyer->id));
        foreach (array_slice($biddable, 0, 5) as $i => $product) {
            Bid::updateOrCreate(
                ['product_id' => $product->id, 'user_id' => $buyer->id],
                [
                    'amount' => round((float) $product->price * 0.92, -2),
                    'message' => 'السلام عليكم، هذا سومي والسعر قابل للتفاوض.',
                    'is_visible' => true,
                    'status' => Bid::STATUS_PENDING,
                ],
            );
            if ($i < 2) {
                Bid::updateOrCreate(
                    ['product_id' => $product->id, 'user_id' => $marketer->id],
                    [
                        'amount' => round((float) $product->price * 0.95, -2),
                        'message' => 'جاهز للشراء بعد المعاينة.',
                        'is_visible' => true,
                        'status' => Bid::STATUS_PENDING,
                    ],
                );
            }
            $product->refreshBidStats();
        }

        foreach (array_slice(array_values(array_filter($products, fn (Product $p) => $p->user_id !== $buyer->id)), 0, 5) as $product) {
            Favorite::firstOrCreate(['user_id' => $buyer->id, 'product_id' => $product->id]);
        }

        $realEstate = Category::query()->where('slug', 'real-estate')->first();
        SavedSearch::firstOrCreate(
            ['user_id' => $buyer->id, 'query' => 'شقة'],
            ['filters' => ['category_id' => $realEstate?->id], 'name' => 'شقق في الرياض'],
        );

        $first = $products[0] ?? null;
        if ($first) {
            $conv = Conversation::firstOrCreate(
                ['dedupe_key' => Conversation::listingDedupeKey((int) $first->id, (int) $buyer->id)],
                [
                    'product_id' => $first->id,
                    'buyer_id' => $buyer->id,
                    'seller_id' => $first->user_id,
                    'conversation_type' => Conversation::TYPE_LISTING,
                ],
            );
            foreach ([
                [$buyer->id, 'السلام عليكم، هل الفيلا ما زالت متاحة؟', true],
                [$first->user_id, 'وعليكم السلام، نعم متاحة. متى يناسبك المعاينة؟', true],
                [$buyer->id, 'بكرة بعد العصر إن شاء الله.', false],
            ] as [$userId, $body, $read]) {
                Message::firstOrCreate(['conversation_id' => $conv->id, 'user_id' => $userId, 'body' => $body], ['read' => $read]);
            }
        }
    }
}
