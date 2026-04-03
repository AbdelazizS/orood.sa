<?php

namespace Database\Seeders;

use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProfileSeeder extends Seeder
{
    public function run(): void
    {
        $city = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('cities')) {
            $city = \App\Models\City::where('name', 'Riyadh City')->first()
                ?? \App\Models\City::first();
        }

        $users = [
            [
                'email' => 'demo@arooth.sa',
                'username' => 'أحمد_محمد',
                'bio' => 'بائع موثوق - متخصص في الإلكترونيات والعقارات. خبرة أكثر من 5 سنوات في السوق المحلي.',
                'avatar_url' => null,
                'cover_photo_url' => null,
                'financial_guarantee' => 5000,
                'is_verified' => true,
            ],
            [
                'email' => 'seller2@arooth.sa',
                'username' => 'بائع_ثاني',
                'bio' => 'متخصص في اللابتوبات والإلكترونيات المستعملة. جودة مضمونة.',
                'avatar_url' => null,
                'cover_photo_url' => null,
                'financial_guarantee' => 2000,
                'is_verified' => false,
            ],
            [
                'email' => 'buyer@arooth.sa',
                'username' => 'مشتري_تجريبي',
                'bio' => 'أبحث عن أفضل العروض في السوق.',
                'avatar_url' => null,
                'cover_photo_url' => null,
                'financial_guarantee' => 0,
                'is_verified' => false,
            ],
        ];

        foreach ($users as $data) {
            $user = User::where('email', $data['email'])->first();
            if ($user) {
                $user->update([
                    'username' => $data['username'],
                    'bio' => $data['bio'],
                    'avatar_url' => $data['avatar_url'],
                    'cover_photo_url' => $data['cover_photo_url'],
                    'financial_guarantee' => $data['financial_guarantee'],
                    'is_verified' => $data['is_verified'],
                    'city_id' => $city?->id,
                    'rating' => $data['email'] === 'demo@arooth.sa' ? 4.5 : 0,
                    'total_ratings' => $data['email'] === 'demo@arooth.sa' ? 12 : 0,
                    'completed_orders' => $data['email'] === 'demo@arooth.sa' ? 45 : 0,
                ]);
            }
        }

        // Ensure all users have username
        User::whereNull('username')->get()->each(function ($user) {
            $base = \Illuminate\Support\Str::slug($user->name, '_');
            $username = $base;
            $i = 1;
            while (User::where('username', $username)->where('id', '!=', $user->id)->exists()) {
                $username = $base . '_' . $i;
                $i++;
            }
            $user->update(['username' => $username]);
        });

        // Seed reviews for demo seller
        $demoSeller = User::where('email', 'demo@arooth.sa')->first();
        $buyer = User::where('email', 'buyer@arooth.sa')->first();
        $seller2 = User::where('email', 'seller2@arooth.sa')->first();

        if ($demoSeller && $buyer) {
            Review::firstOrCreate(
                [
                    'reviewer_id' => $buyer->id,
                    'reviewee_id' => $demoSeller->id,
                ],
                [
                    'rating' => 5,
                    'comment' => 'تعامل ممتاز، المنتج كما هو موصوف. أنصح بالتعامل معه.',
                    'is_visible' => true,
                ]
            );
        }

        if ($demoSeller && $seller2) {
            Review::firstOrCreate(
                [
                    'reviewer_id' => $seller2->id,
                    'reviewee_id' => $demoSeller->id,
                ],
                [
                    'rating' => 4,
                    'comment' => 'شريك موثوق في السوق.',
                    'is_visible' => true,
                ]
            );
        }
    }
}
