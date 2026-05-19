<?php

namespace Database\Seeders\Support;

/**
 * Full HTML bodies for public CMS legal/help pages (Haraj-style depth).
 */
final class CmsPageBodies
{
    public static function helpAr(): string
    {
        return <<<'HTML'
<h2>الأسئلة الشائعة</h2>
<h3>كيف يمكنني التسجيل في المنصة؟</h3>
<p>اضغط «تسجيل الدخول» ثم «إنشاء حساب جديد». تحتاج بريداً إلكترونياً أو رقم جوال سعودي صالح.</p>
<h3>كيف أضيف عرضاً جديداً؟</h3>
<ul>
<li>سجّل الدخول إلى حسابك</li>
<li>اضغط «أضف عرض»</li>
<li>اختر القسم (عقارات، سيارات، أثاث، إلكترونيات…)</li>
<li>أضف صوراً ووصفاً دقيقاً والسعر</li>
<li>انشر الإعلان — مجاناً حالياً</li>
</ul>
<h3>كيف أشتري منتجاً؟</h3>
<p>تصفح العروض، تواصل مع البائع أو أكمل الشراء عبر المنصة للاستفادة من الضمان المالي عند توفره.</p>
<h3>ماذا يعني سوق الجملة؟</h3>
<p>قسم مخصص للشركات لعرض منتجات بأسعار الجملة. يمكنك الحجز أو الشراء الجماعي حسب شروط البائع.</p>
<h3>كيف يعمل الضمان المالي؟</h3>
<p>يُحجز المبلغ لدى المنصة حتى تأكيد الاستلام في الطلبات المؤهلة، ثم يُحرر للبائع.</p>
<h3>كيف أستلم أموالي كبائع؟</h3>
<p>بعد تأكيد المشتري للاستلام يُحرر المبلغ وفق سياسة الدفع المعتمدة على الطلب.</p>
<h3>ماذا أفعل عند مشكلة مع بائع؟</h3>
<p>افتح نزاعاً داخل الطلب أو تواصل مع <a href="/contact">خدمات العملاء</a> أو <a href="/contact?topic=report">الإبلاغ عن مشكلة</a>.</p>
<div class="legal-callout"><p><strong>لم تجد إجابتك؟</strong> فريق الدعم يرد خلال 24 ساعة عبر صفحة التواصل.</p></div>
HTML;
    }

    public static function helpEn(): string
    {
        return <<<'HTML'
<h2>Frequently asked questions</h2>
<h3>How do I register?</h3>
<p>Use Login → Create account with email or Saudi mobile number.</p>
<h3>How do I add a listing?</h3>
<p>Go to Add listing, pick a category, add photos and details, then publish.</p>
<h3>How does wholesale work?</h3>
<p>Browse company catalogs, reserve quantity, and complete checkout on the wholesale flow.</p>
<h3>Financial guarantee</h3>
<p>Funds may be held until delivery is confirmed on eligible orders.</p>
<p><a href="/contact">Customer service</a> · <a href="/contact?topic=report">Report an issue</a></p>
HTML;
    }

    public static function termsAr(): string
    {
        return <<<'HTML'
<p><em>آخر تحديث: 1 يناير 2026</em></p>
<h2>1. قبول الشروط</h2>
<p>باستخدامك منصة عروض Arooth فإنك توافق على هذه الشروط.</p>
<h2>2. التسجيل والحساب</h2>
<ul>
<li>العمر 18 سنة فأكثر</li>
<li>بيانات صحيحة وحساب واحد لكل مستخدم</li>
<li>عدم انتحال شخصية الغير</li>
</ul>
<h2>3. الإعلانات والمنتجات</h2>
<p>يُحظر الإعلان عن سلع ممنوعة أو مضللة. للمنصة حق حذف الإعلان المخالف.</p>
<h2>4. البيع والشراء</h2>
<p>البائع مسؤول عن الوصف والتسليم. المشتري مسؤول عن المراجعة قبل الدفع. الضمان ساري للمعاملات داخل المنصة فقط.</p>
<h2>5. الرسوم</h2>
<p>نشر الإعلانات مجاني حالياً. أي عمولات مستقبلية تُعلن مسبقاً.</p>
<h2>6. إيقاف الحسابات</h2>
<p>يجوز للمنصة إيقاف الحسابات المخالفة دون إنذار مسبق.</p>
<h2>7. حل النزاعات</h2>
<p>الحل الودي أولاً، ثم تدخل المنصة. النزاعات الكبيرة تُحال للجهات القضائية في المملكة.</p>
<h2>8. التعديلات</h2>
<p>قد نعدّل الشروط مع إشعار بالتغييرات الجوهرية.</p>
<h2>9. التواصل القانوني</h2>
<p>للاستفسارات القانونية، <a href="/contact">تواصل معنا عبر صفحة خدمات العملاء</a>.</p>
HTML;
    }

    public static function termsEn(): string
    {
        return self::termsAr();
    }

    public static function privacyAr(): string
    {
        return <<<'HTML'
<p><em>آخر تحديث: 1 يناير 2026</em></p>
<h2>1. المعلومات التي نجمعها</h2>
<p>بيانات الحساب، الإعلانات، المعاملات، وسجلات الاستخدام.</p>
<h2>2. كيفية الاستخدام</h2>
<p>تشغيل الخدمة، منع الاحتيال، التواصل، والامتثال للأنظمة.</p>
<h2>3. مشاركة المعلومات</h2>
<p>لا نبيع بياناتك. قد نشارك الحد الأدنى مع الدفع والشحن أو الجهات الرسمية عند الطلب.</p>
<h2>4. الحماية</h2>
<p>تشفير SSL وكلمات مرور مشفرة وصلاحيات وصول محدودة.</p>
<h2>5. ملفات تعريف الارتباط</h2>
<p>لتحسين التجربة. يمكن تعطيلها من المتصفح.</p>
<h2>6. حقوقك</h2>
<p>طلب نسخة أو تصحيح أو حذف بياناتك عبر <a href="/contact">خدمات العملاء</a>.</p>
<h2>7. خصوصية الأطفال</h2>
<p>المنصة لمن هم 18+.</p>
<p>للاستفسارات المتعلقة بالخصوصية، <a href="/contact">تواصل معنا عبر صفحة خدمات العملاء</a>.</p>
HTML;
    }

    public static function privacyEn(): string
    {
        return <<<'HTML'
<p><em>Last updated: January 1, 2026</em></p>
<h2>Data we collect</h2>
<p>Account, listing, transaction, and usage data.</p>
<h2>How we use it</h2>
<p>To operate the marketplace, prevent fraud, and comply with law.</p>
<h2>Your rights</h2>
<p>Request access, correction, or deletion via the <a href="/contact">contact page</a>.</p>
<p>For privacy inquiries, use our <a href="/contact">customer service page</a>.</p>
HTML;
    }

    public static function refundAr(): string
    {
        return <<<'HTML'
<p><em>آخر تحديث: 1 يناير 2026</em></p>
<h2>1. متى يمكنك الاسترجاع؟</h2>
<table>
<thead><tr><th>الحالة</th><th>استحقاق</th></tr></thead>
<tbody>
<tr><td>منتج مختلف عن الوصف</td><td>نعم</td></tr>
<tr><td>تالف أثناء الشحن</td><td>نعم</td></tr>
<tr><td>عدم التسليم</td><td>نعم</td></tr>
<tr><td>تغيير الرأي فقط</td><td>حسب البائع</td></tr>
</tbody>
</table>
<h2>2. مهلة الاسترجاع</h2>
<p>خلال <strong>7 أيام</strong> من الاستلام للطلبات المؤهلة.</p>
<h2>3. حالة المنتج</h2>
<p>نفس الحالة الأصلية مع الملحقات ما لم يكن عيباً مصنعياً.</p>
<h2>4. مصاريف الشحن</h2>
<p>حسب سبب الاسترجاع وقرار النزاع.</p>
<h2>5. استرداد المبلغ</h2>
<p>إلى المحفظة خلال 3–5 أيام بعد إغلاق النزاع.</p>
<h2>6. استثناءات الجملة</h2>
<p>سياسة البائع في صفحة المنتج هي المعتمدة.</p>
<p>لطلبات الاسترجاع، <a href="/contact">تواصل معنا عبر صفحة خدمات العملاء</a>.</p>
HTML;
    }

    public static function refundEn(): string
    {
        return self::refundAr();
    }

    public static function aboutAr(): string
    {
        return <<<'HTML'
<h2>من نحن</h2>
<p>منصة <strong>عروض Arooth</strong> سوق سعودي يربط البائعين والمشترين للعروض الجديدة والمستعملة وطلبات الشراء وسوق الجملة.</p>
<h2>رؤيتنا</h2>
<p>أكبر سوق موثوق في المملكة لبيع وشراء كل شيء بأمان.</p>
<h2>رسالتنا</h2>
<p>تسهيل التجارة مع خيارات دفع وضمان تقلل المخاطر.</p>
<h2>قيمنا</h2>
<table>
<thead><tr><th>القيمة</th><th>الوصف</th></tr></thead>
<tbody>
<tr><td>الشفافية</td><td>معلومات واضحة للمستخدم</td></tr>
<tr><td>الأمان</td><td>حماية البيانات والمعاملات</td></tr>
<tr><td>الثقة</td><td>بيئة موثوقة للتعامل</td></tr>
</tbody>
</table>
<h2>إحصائيات</h2>
<ul>
<li>التأسيس: 2026</li>
<li>تغطية مدن متعددة في المملكة</li>
</ul>
<p>للشراكات والاستفسارات العامة، <a href="/contact">تواصل معنا عبر صفحة خدمات العملاء</a>.</p>
HTML;
    }

    public static function aboutEn(): string
    {
        return <<<'HTML'
<h2>About Arooth</h2>
<p>Saudi marketplace connecting buyers and sellers for listings, requests, and wholesale.</p>
<h2>Vision</h2>
<p>The most trusted marketplace in the Kingdom.</p>
<p><a href="/contact">Customer service</a></p>
HTML;
    }
}
