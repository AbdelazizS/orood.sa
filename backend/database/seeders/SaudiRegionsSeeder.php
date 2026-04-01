<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use App\Models\Region;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Full Saudi Arabia regions and cities with Arabic/English localization.
 * Based on official Saudi administrative divisions.
 */
class SaudiRegionsSeeder extends Seeder
{
    public function run(): void
    {
        $regions = [
            'Riyadh' => [
                'name_ar' => 'الرياض',
                'cities' => [
                    ['en' => 'Riyadh City', 'ar' => 'الرياض'],
                    ['en' => 'Diriyah', 'ar' => 'الدرعية'],
                    ['en' => 'Al Kharj', 'ar' => 'الخرج'],
                    ['en' => 'Ad Dilam', 'ar' => 'الدلم'],
                    ['en' => 'Al Majmaah', 'ar' => 'المجمعة'],
                    ['en' => 'Al Ghat', 'ar' => 'الغاط'],
                    ['en' => 'Al Zulfi', 'ar' => 'الزلفي'],
                    ['en' => 'Shaqra', 'ar' => 'شقراء'],
                    ['en' => 'Dhurma', 'ar' => 'ضرما'],
                    ['en' => 'Al Muwayh', 'ar' => 'المويه'],
                ],
            ],
            'Makkah' => [
                'name_ar' => 'مكة المكرمة',
                'cities' => [
                    ['en' => 'Jeddah', 'ar' => 'جدة'],
                    ['en' => 'Makkah City', 'ar' => 'مكة المكرمة'],
                    ['en' => 'Taif', 'ar' => 'الطائف'],
                    ['en' => 'Rabigh', 'ar' => 'رابغ'],
                    ['en' => 'Al Lith', 'ar' => 'الليث'],
                    ['en' => 'Al Qunfudhah', 'ar' => 'القنفذة'],
                    ['en' => 'Al Jumum', 'ar' => 'الجموم'],
                    ['en' => 'Khulais', 'ar' => 'خليص'],
                    ['en' => 'Rania', 'ar' => 'رنية'],
                    ['en' => 'Turubah', 'ar' => 'تربة'],
                ],
            ],
            'Madinah' => [
                'name_ar' => 'المدينة المنورة',
                'cities' => [
                    ['en' => 'Madinah City', 'ar' => 'المدينة المنورة'],
                    ['en' => 'Yanbu', 'ar' => 'ينبع'],
                    ['en' => 'Al Ula', 'ar' => 'العلا'],
                    ['en' => 'Khaybar', 'ar' => 'خيبر'],
                    ['en' => 'Badr', 'ar' => 'بدر'],
                    ['en' => 'Al Mahd', 'ar' => 'المهد'],
                ],
            ],
            'Eastern Province' => [
                'name_ar' => 'المنطقة الشرقية',
                'cities' => [
                    ['en' => 'Dammam', 'ar' => 'الدمام'],
                    ['en' => 'Khobar', 'ar' => 'الخبر'],
                    ['en' => 'Dhahran', 'ar' => 'الظهران'],
                    ['en' => 'Qatif', 'ar' => 'القطيف'],
                    ['en' => 'Al Ahsa', 'ar' => 'الأحساء'],
                    ['en' => 'Jubail', 'ar' => 'الجبيل'],
                    ['en' => 'Ras Tanura', 'ar' => 'رأس تنورة'],
                    ['en' => 'Hafr Al Batin', 'ar' => 'حفر الباطن'],
                    ['en' => 'Al Nairyah', 'ar' => 'النعيرية'],
                ],
            ],
            'Qassim' => [
                'name_ar' => 'القصيم',
                'cities' => [
                    ['en' => 'Buraidah', 'ar' => 'بريدة'],
                    ['en' => 'Unaizah', 'ar' => 'عنيزة'],
                    ['en' => 'Ar Rass', 'ar' => 'الرس'],
                    ['en' => 'Al Mithnab', 'ar' => 'المذنب'],
                    ['en' => 'Al Badaya', 'ar' => 'البادية'],
                    ['en' => 'Riyadh Al Khabra', 'ar' => 'رياض الخبراء'],
                ],
            ],
            'Asir' => [
                'name_ar' => 'عسير',
                'cities' => [
                    ['en' => 'Abha', 'ar' => 'أبها'],
                    ['en' => 'Khamis Mushait', 'ar' => 'خميس مشيط'],
                    ['en' => 'Bisha', 'ar' => 'بيشة'],
                    ['en' => 'Ahad Rafidah', 'ar' => 'أحد رفيدة'],
                    ['en' => 'Bariq', 'ar' => 'بارق'],
                    ['en' => 'Sarat Abidah', 'ar' => 'سراة عبيدة'],
                ],
            ],
            'Tabuk' => [
                'name_ar' => 'تبوك',
                'cities' => [
                    ['en' => 'Tabuk', 'ar' => 'تبوك'],
                    ['en' => 'Al Wajh', 'ar' => 'الوجه'],
                    ['en' => 'Duba', 'ar' => 'ضباء'],
                    ['en' => 'Tayma', 'ar' => 'تيماء'],
                    ['en' => 'Umluj', 'ar' => 'أملج'],
                ],
            ],
            'Hail' => [
                'name_ar' => 'حائل',
                'cities' => [
                    ['en' => 'Hail', 'ar' => 'حائل'],
                    ['en' => 'Baqaa', 'ar' => 'بقعاء'],
                    ['en' => 'Al Ghazalah', 'ar' => 'الغزالة'],
                ],
            ],
            'Northern Borders' => [
                'name_ar' => 'الحدود الشمالية',
                'cities' => [
                    ['en' => 'Arar', 'ar' => 'عرعر'],
                    ['en' => 'Turaif', 'ar' => 'طريف'],
                    ['en' => 'Al Uwayqilah', 'ar' => 'العويقيلة'],
                ],
            ],
            'Jazan' => [
                'name_ar' => 'جازان',
                'cities' => [
                    ['en' => 'Jazan', 'ar' => 'جازان'],
                    ['en' => 'Sabya', 'ar' => 'صبيا'],
                    ['en' => 'Abu Arish', 'ar' => 'أبو عريش'],
                    ['en' => 'Samtah', 'ar' => 'صامطة'],
                    ['en' => 'Baish', 'ar' => 'بيش'],
                    ['en' => 'Farasan', 'ar' => 'فرسان'],
                ],
            ],
            'Najran' => [
                'name_ar' => 'نجران',
                'cities' => [
                    ['en' => 'Najran', 'ar' => 'نجران'],
                    ['en' => 'Sharurah', 'ar' => 'شرورة'],
                    ['en' => 'Habuna', 'ar' => 'حبونا'],
                    ['en' => 'Badr Al Janub', 'ar' => 'بدر الجنوب'],
                ],
            ],
            'Al Baha' => [
                'name_ar' => 'الباحة',
                'cities' => [
                    ['en' => 'Al Baha', 'ar' => 'الباحة'],
                    ['en' => 'Baljurashi', 'ar' => 'بلجرشي'],
                    ['en' => 'Al Mandaq', 'ar' => 'المندق'],
                    ['en' => 'Al Mikhwah', 'ar' => 'المخواة'],
                    ['en' => 'Qilwah', 'ar' => 'قلوة'],
                ],
            ],
            'Al Jawf' => [
                'name_ar' => 'الجوف',
                'cities' => [
                    ['en' => 'Sakaka', 'ar' => 'سكاكا'],
                    ['en' => 'Dumat Al Jandal', 'ar' => 'دومة الجندل'],
                    ['en' => 'Tabarjal', 'ar' => 'طبرجل'],
                    ['en' => 'Qurayyat', 'ar' => 'القريات'],
                ],
            ],
        ];

        foreach ($regions as $regionName => $data) {
            $slug = Str::slug($regionName);
            $region = Region::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $regionName,
                    'name_ar' => $data['name_ar'] ?? null,
                    'name_en' => $regionName,
                    'is_active' => true,
                ],
            );

            foreach ($data['cities'] as $city) {
                $cityName = $city['en'];
                $citySlug = Str::slug($cityName);
                City::updateOrCreate(
                    ['region_id' => $region->id, 'slug' => $citySlug],
                    [
                        'name' => $cityName,
                        'name_ar' => $city['ar'] ?? null,
                        'name_en' => $cityName,
                        'is_active' => true,
                    ],
                );
            }
        }

        // Sync category-region visibility for all categories
        $categories = Category::all();
        $allRegions = Region::all();
        foreach ($categories as $category) {
            foreach ($allRegions as $region) {
                $category->regions()->syncWithoutDetaching([$region->id => ['is_visible' => true]]);
            }
        }
    }
}
