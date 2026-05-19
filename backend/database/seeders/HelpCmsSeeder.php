<?php

namespace Database\Seeders;

use App\Models\HelpBlock;
use App\Models\SupportContact;
use App\Models\SupportSetting;
use App\Services\AdminSettingsService;
use Illuminate\Database\Seeder;

class HelpCmsSeeder extends Seeder
{
    public function run(): void
    {
        $email = AdminSettingsService::resolveContactSupportEmail();

        $settingsPayload = array_filter([
            'support_email' => $email !== '' ? $email : null,
            'hours_ar' => 'أوقات العمل: الأحد – الخميس، 9 ص – 6 م',
            'hours_en' => 'Hours: Sun – Thu, 9 AM – 6 PM',
        ], fn ($v) => $v !== null && $v !== '');

        $settings = SupportSetting::query()->first();
        if ($settings) {
            $settings->update($settingsPayload);
        } else {
            SupportSetting::query()->create($settingsPayload);
        }

        if ($email !== '') {
            SupportContact::updateOrCreate(
                ['type' => 'email', 'value' => $email],
                ['label_ar' => 'البريد الإلكتروني', 'label_en' => 'Email', 'visible' => true, 'sort_order' => 1],
            );
        }

        SupportContact::query()->where('value', 'like', '%example.com%')->delete();

        HelpBlock::updateOrCreate(
            ['page_key' => 'dashboard_help', 'block_type' => 'hero', 'sort_order' => 1],
            [
                'visible' => true,
                'config_json' => [
                    'ar' => [
                        'title' => 'مركز المساعدة',
                        'subtitle' => 'إرشادات لاستخدام المنصة: الطلبات، المحفظة، الإعلانات، والضمان المالي.',
                    ],
                    'en' => [
                        'title' => 'Help center',
                        'subtitle' => 'Guides for orders, wallet, listings, and financial guarantee on the platform.',
                    ],
                ],
            ],
        );

        HelpBlock::updateOrCreate(
            ['page_key' => 'dashboard_help', 'block_type' => 'onboarding_steps', 'sort_order' => 2],
            [
                'visible' => true,
                'config_json' => [
                    'ar' => [
                        'title' => 'كيف تبدأ',
                        'steps' => [
                            'أنشئ حسابك وأكمل ملفك الشخصي لبناء الثقة مع المشترين والبائعين.',
                            'للشراء: تصفّح العروض، اختر طريقة الدفع المناسبة، وتتبع طلبك من «تتبع الطلبات».',
                            'للبيع: أضف إعلانك من «إعلاناتي»، فعّل السومات أو السعر الثابت، وتابع الطلبات والرصيد.',
                            'للدعم: استخدم هذه الصفحة أو صفحة «تواصل معنا» للاستفسارات الرسمية.',
                        ],
                    ],
                    'en' => [
                        'title' => 'Getting started',
                        'steps' => [
                            'Create your account and complete your profile to build trust.',
                            'To buy: browse listings, choose a payment method, and track orders from Order tracking.',
                            'To sell: add a listing, enable bids or fixed price, then manage orders and balance.',
                            'For support: use this page or Contact us for official inquiries.',
                        ],
                    ],
                ],
            ],
        );

        HelpBlock::updateOrCreate(
            ['page_key' => 'dashboard_help', 'block_type' => 'info', 'sort_order' => 3],
            [
                'visible' => true,
                'config_json' => [
                    'ar' => [
                        'title' => 'المحفظة والرصيد',
                        'body' => "شحن الرصيد: من المحفظة → الرصيد → شحن الرصيد، ثم اتبع تعليمات التحويل البنكي.\n\nالسحب: متاح من الرصيد القابل للسحب بعد استيفاء الشروط.\n\nالضمان المالي: يُحجز المبلغ عند الدفع عبر المنصة حتى تأكيد الاستلام.",
                    ],
                    'en' => [
                        'title' => 'Wallet & balance',
                        'body' => "Top-up: Wallet → Balance → Charge balance, then follow bank transfer instructions.\n\nWithdrawals: available from withdrawable balance when eligible.\n\nEscrow: funds are held when paying through the platform until delivery is confirmed.",
                    ],
                ],
            ],
        );

        HelpBlock::updateOrCreate(
            ['page_key' => 'dashboard_help', 'block_type' => 'info', 'sort_order' => 4],
            [
                'visible' => true,
                'config_json' => [
                    'ar' => [
                        'title' => 'الطلبات والبيع',
                        'body' => "تتبع مشترياتك ومبيعاتك من «تتبع الطلبات».\n\nالبائع: أكّد قبول الطلب، حدّث حالة الشحن، وتواصل مع المشتري عبر الرسائل عند الحاجة.\n\nالمشتري: أكّد الاستلام بعد التسليم لإتمام عملية الضمان.",
                    ],
                    'en' => [
                        'title' => 'Orders & selling',
                        'body' => "Track purchases and sales from Order tracking.\n\nSellers: accept orders, update shipping status, and message buyers when needed.\n\nBuyers: confirm receipt after delivery to complete escrow.",
                    ],
                ],
            ],
        );

        HelpBlock::updateOrCreate(
            ['page_key' => 'dashboard_help', 'block_type' => 'faq', 'sort_order' => 5],
            [
                'visible' => true,
                'config_json' => [
                    'ar' => ['title' => 'أسئلة شائعة'],
                    'en' => ['title' => 'FAQ'],
                    'items' => [
                        [
                            'question_ar' => 'كيف أتتبع طلباتي؟',
                            'answer_ar' => 'من لوحة التحكم اختر «تتبع الطلبات» لعرض حالة مشترياتك ومبيعاتك وتفاصيل كل طلب.',
                            'question_en' => 'How do I track my orders?',
                            'answer_en' => 'Open Order tracking in your dashboard to see purchase and sale status for each order.',
                        ],
                        [
                            'question_ar' => 'كيف أشحن المحفظة؟',
                            'answer_ar' => 'اذهب إلى المحفظة → الرصيد → شحن الرصيد، أدخل المبلغ وارفع إيصال التحويل. يُراجع الطلب من الإدارة قبل إضافة الرصيد.',
                            'question_en' => 'How do I top up my wallet?',
                            'answer_en' => 'Go to Wallet → Balance → Charge balance, enter the amount and upload your transfer receipt. Requests are reviewed before credit.',
                        ],
                        [
                            'question_ar' => 'كيف يعمل الضمان المالي؟',
                            'answer_ar' => 'عند الدفع عبر المنصة يُحجز المبلغ حتى يؤكد المشتري الاستلام، ثم يُضاف للبائع في رصيده وفق سياسة المنصة.',
                            'question_en' => 'How does the financial guarantee work?',
                            'answer_en' => 'When paying through the platform, funds are held until the buyer confirms receipt, then credited to the seller per platform policy.',
                        ],
                        [
                            'question_ar' => 'كيف أضيف إعلاناً؟',
                            'answer_ar' => 'من «إعلاناتي» أو «إضافة عرض»، املأ التفاصيل والصور، واختر الفئة والسعر. قد تتطلب بعض الإعلانات مراجعة قبل النشر.',
                            'question_en' => 'How do I add a listing?',
                            'answer_en' => 'Use My listings or Add offer, fill in details and photos, and set category and price. Some listings may need review before publishing.',
                        ],
                        [
                            'question_ar' => 'ما الفرق بين الدفع عند الاستلام والدفع عبر المنصة؟',
                            'answer_ar' => 'الدفع عبر المنصة يوفّر ضماناً للمبلغ حتى الاستلام. الدفع عند الاستلام يعتمد على اتفاقك المباشر مع البائع حسب إعدادات الإعلان.',
                            'question_en' => 'What is the difference between COD and platform payment?',
                            'answer_en' => 'Platform payment holds funds until delivery. Cash on delivery depends on the listing settings and your agreement with the seller.',
                        ],
                    ],
                ],
            ],
        );

        $this->command?->info('Help CMS seeded (dashboard_help).');
    }
}
