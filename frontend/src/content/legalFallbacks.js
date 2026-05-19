/** Offline fallback when CMS API has no row yet (e.g. before seeder). */
export const LEGAL_PAGE_FALLBACKS = {
  help: {
    ar: {
      title: "مركز المساعدة",
      body_html: `<h2>الأسئلة الشائعة</h2>
<h3>كيف يمكنني التسجيل في المنصة؟</h3>
<p>اضغط «تسجيل الدخول» ثم «إنشاء حساب جديد».</p>
<h3>كيف أضيف عرضاً جديداً؟</h3>
<p>سجّل الدخول، اضغط «أضف عرض»، اختر القسم، وأضف الصور والوصف والسعر.</p>
<h3>ماذا أفعل عند مشكلة مع بائع؟</h3>
<p>افتح نزاعاً داخل الطلب أو تواصل مع <a href="/contact">خدمات العملاء</a>.</p>`,
    },
    en: {
      title: "Help center",
      body_html: `<h2>FAQ</h2>
<p>Use Login → Create account, then Add listing to publish.</p>
<p><a href="/contact">Customer service</a></p>`,
    },
  },
}
