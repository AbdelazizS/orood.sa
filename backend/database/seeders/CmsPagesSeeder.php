<?php

namespace Database\Seeders;

use App\Models\CmsPage;
use Database\Seeders\Support\CmsPageBodies;
use Illuminate\Database\Seeder;

class CmsPagesSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            'privacy-policy' => [
                'ar' => ['title' => 'سياسة الخصوصية', 'body' => CmsPageBodies::privacyAr()],
                'en' => ['title' => 'Privacy Policy', 'body' => CmsPageBodies::privacyEn()],
            ],
            'terms' => [
                'ar' => ['title' => 'الشروط والأحكام', 'body' => CmsPageBodies::termsAr()],
                'en' => ['title' => 'Terms of Service', 'body' => CmsPageBodies::termsEn()],
            ],
            'refund-policy' => [
                'ar' => ['title' => 'سياسة الاسترجاع والاسترداد', 'body' => CmsPageBodies::refundAr()],
                'en' => ['title' => 'Refund Policy', 'body' => CmsPageBodies::refundEn()],
            ],
            'payment-policy' => [
                'ar' => ['title' => 'سياسة الدفع والتحويلات', 'body' => $this->paymentAr()],
                'en' => ['title' => 'Payment Policy', 'body' => $this->paymentEn()],
            ],
            'listing-policy' => [
                'ar' => ['title' => 'سياسة الإعلانات', 'body' => $this->listingAr()],
                'en' => ['title' => 'Listing Policy', 'body' => $this->listingEn()],
            ],
            'safety' => [
                'ar' => ['title' => 'الأمان والثقة', 'body' => $this->safetyAr()],
                'en' => ['title' => 'Safety Center', 'body' => $this->safetyEn()],
            ],
            'fees' => [
                'ar' => ['title' => 'العمولات والأسعار', 'body' => $this->feesAr()],
                'en' => ['title' => 'Fees & Pricing', 'body' => $this->feesEn()],
            ],
            'about' => [
                'ar' => ['title' => 'عن المنصة', 'body' => CmsPageBodies::aboutAr()],
                'en' => ['title' => 'About Us', 'body' => CmsPageBodies::aboutEn()],
            ],
            'help' => [
                'ar' => ['title' => 'مركز المساعدة', 'body' => CmsPageBodies::helpAr()],
                'en' => ['title' => 'Help Center', 'body' => CmsPageBodies::helpEn()],
            ],
        ];

        foreach ($pages as $slug => $locales) {
            foreach ($locales as $locale => $content) {
                CmsPage::updateOrCreate(
                    ['slug' => $slug, 'locale' => $locale],
                    [
                        'title' => $content['title'],
                        'body_html' => $content['body'],
                        'meta_title' => $content['title'].' | عروض',
                        'meta_description' => mb_substr(strip_tags($content['body']), 0, 160),
                        'status' => CmsPage::STATUS_PUBLISHED,
                        'published_at' => now(),
                        'version' => 1,
                    ],
                );
            }
        }
    }

    private function paymentAr(): string
    {
        return '<h2>الدفع عبر المنصة</h2><p>يُحجز المبلغ لدى المنصة حتى تأكيد الاستلام للطلبات بالضمان.</p><h2>التحويل المباشر</h2><p>يرفع المشتري السند ويؤكد إرسال الحوالة؛ يؤكد البائع الاستلام قبل الشحن.</p><h2>الدفع عند الاستلام</h2><p>يُسدّد المبلغ عند التسليم حسب اتفاق الطرفين.</p>';
    }

    private function paymentEn(): string
    {
        return '<h2>Platform escrow</h2><p>Funds are held until delivery confirmation for escrow orders.</p><h2>Direct transfer</h2><p>Buyer uploads proof and confirms sending; seller confirms receipt before shipping.</p><h2>COD</h2><p>Payment on delivery per seller acceptance.</p>';
    }

    private function listingAr(): string
    {
        return '<h2>المسموح</h2><p>منتجات وخدمات قانونية في المملكة.</p><h2>الممنوع</h2><p>إعلانات وهمية، سلع مسروقة، محتوى مخالف.</p>';
    }

    private function listingEn(): string
    {
        return '<h2>Allowed</h2><p>Legal products and services.</p><h2>Prohibited</h2><p>Fake listings, stolen goods, illegal content.</p>';
    }

    private function safetyAr(): string
    {
        return '<h2>نصائح</h2><p>لا تحوّل خارج المنصة قبل إتمام الطلب. تحقق من الملف قبل الدفع.</p><h2>الإبلاغ</h2><p>أبلغ عن الإعلانات المشبوهة من صفحة الإعلان أو التواصل.</p>';
    }

    private function safetyEn(): string
    {
        return '<h2>Tips</h2><p>Do not pay off-platform before completing the order flow.</p><h2>Report</h2><p>Report suspicious listings via contact or listing report.</p>';
    }

    private function feesAr(): string
    {
        return '<h2>العمولات</h2><p>قد تُطبّق عمولة على المبيعات حسب إعدادات المنصة. تُعرض الرسوم قبل إتمام الشراء.</p>';
    }

    private function feesEn(): string
    {
        return '<h2>Fees</h2><p>Sales fees may apply per platform settings and are shown before checkout.</p>';
    }
}
