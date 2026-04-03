/**
 * Demo data for standalone frontend when backend is unavailable.
 * Set VITE_USE_DEMO=true to enable. Remove or set false for real deployment.
 */

export const DEMO_CATEGORIES = [
  { id: 1, name: "سيارات ومركبات", nameAr: "سيارات ومركبات", icon: "🚗", subcategories: [
    { id: 101, name: "سيارات", nameAr: "سيارات" },
    { id: 102, name: "دراجات نارية", nameAr: "دراجات نارية" },
    { id: 103, name: "قوارب", nameAr: "قوارب" },
    { id: 104, name: "شاحنات", nameAr: "شاحنات" },
    { id: 105, name: "قطع غيار", nameAr: "قطع غيار" },
    { id: 106, name: "أخرى", nameAr: "أخرى" },
  ] },
  { id: 2, name: "جوالات وأرقام", nameAr: "جوالات وأرقام", icon: "📱", subcategories: [
    { id: 201, name: "جوالات", nameAr: "جوالات" },
    { id: 202, name: "أرقام مميزة", nameAr: "أرقام مميزة" },
    { id: 203, name: "ساعات ذكية", nameAr: "ساعات ذكية" },
    { id: 204, name: "أجهزة لوحية", nameAr: "أجهزة لوحية" },
    { id: 205, name: "إكسسوارات جوالات", nameAr: "إكسسوارات جوالات" },
  ] },
  { id: 3, name: "أثاث وديكور", nameAr: "أثاث وديكور", icon: "🛋️", subcategories: [
    { id: 301, name: "اثاث منزلي", nameAr: "اثاث منزلي" },
    { id: 302, name: "كنب", nameAr: "كنب" },
    { id: 303, name: "اثاث مكتبي", nameAr: "اثاث مكتبي" },
    { id: 304, name: "طاولات وكراسي", nameAr: "طاولات وكراسي" },
    { id: 305, name: "اسرة ومراتب", nameAr: "اسرة ومراتب" },
    { id: 306, name: "دواليب وخزائن", nameAr: "دواليب وخزائن" },
    { id: 307, name: "ديكور وتحف وزينة", nameAr: "ديكور وتحف وزينة" },
    { id: 308, name: "مفروشات", nameAr: "مفروشات" },
  ] },
  { id: 4, name: "أجهزة وإلكترونيات", nameAr: "أجهزة وإلكترونيات", icon: "📺", subcategories: [
    { id: 401, name: "تلفزيونات", nameAr: "تلفزيونات" },
    { id: 402, name: "ثلاجات", nameAr: "ثلاجات" },
    { id: 403, name: "غسالات", nameAr: "غسالات" },
    { id: 404, name: "مكيفات", nameAr: "مكيفات" },
    { id: 405, name: "أجهزة مطبخ", nameAr: "أجهزة مطبخ" },
  ] },
  { id: 5, name: "ملبس وأزياء", nameAr: "ملبس وأزياء", icon: "👗", subcategories: [
    { id: 501, name: "ملابس رجالية", nameAr: "ملابس رجالية" },
    { id: 502, name: "ملابس نسائية", nameAr: "ملابس نسائية" },
    { id: 503, name: "أحذية", nameAr: "أحذية" },
    { id: 504, name: "حقائب", nameAr: "حقائب" },
    { id: 505, name: "إكسسوارات", nameAr: "إكسسوارات" },
  ] },
  { id: 6, name: "كمبيوترات وإنترنت", nameAr: "كمبيوترات وإنترنت", icon: "🖥️", subcategories: [
    { id: 601, name: "لابتوب", nameAr: "لابتوب" },
    { id: 602, name: "كمبيوتر مكتبي", nameAr: "كمبيوتر مكتبي" },
    { id: 603, name: "شاشات", nameAr: "شاشات" },
    { id: 604, name: "طابعات", nameAr: "طابعات" },
  ] },
  { id: 7, name: "ألعاب", nameAr: "ألعاب", icon: "🎮", subcategories: [
    { id: 701, name: "ألعاب فيديو", nameAr: "ألعاب فيديو" },
    { id: 702, name: "أجهزة ألعاب", nameAr: "أجهزة ألعاب" },
    { id: 703, name: "ألعاب أطفال", nameAr: "ألعاب أطفال" },
  ] },
  { id: 8, name: "عقارات", nameAr: "عقارات", icon: "🏠", subcategories: [
    { id: 801, name: "شقق للإيجار", nameAr: "شقق للإيجار" },
    { id: 802, name: "شقق للبيع", nameAr: "شقق للبيع" },
    { id: 803, name: "فلل", nameAr: "فلل" },
    { id: 804, name: "أراضي", nameAr: "أراضي" },
  ] },
  { id: 9, name: "خدمات", nameAr: "خدمات", icon: "⚙️", subcategories: [
    { id: 901, name: "خدمات صيانة", nameAr: "خدمات صيانة" },
    { id: 902, name: "خدمات تنظيف", nameAr: "خدمات تنظيف" },
    { id: 903, name: "خدمات نقل", nameAr: "خدمات نقل" },
    { id: 904, name: "خدمات تقنية", nameAr: "خدمات تقنية" },
  ] },
  { id: 10, name: "أخرى", nameAr: "أخرى", icon: "📦", subcategories: [
    { id: 1001, name: "متنوع", nameAr: "متنوع" },
    { id: 1002, name: "مقتنيات", nameAr: "مقتنيات" },
    { id: 1003, name: "هوايات", nameAr: "هوايات" },
  ] },
]

export const DEMO_REGIONS = [
  { id: 1, name: "منطقة الرياض", nameAr: "منطقة الرياض", cities: [
    { id: 1, name: "الرياض", nameAr: "الرياض" }, { id: 2, name: "الخرج", nameAr: "الخرج" },
    { id: 3, name: "الدرعية", nameAr: "الدرعية" }, { id: 4, name: "الدوادمي", nameAr: "الدوادمي" },
    { id: 5, name: "المجمعة", nameAr: "المجمعة" }, { id: 6, name: "المزاحمية", nameAr: "المزاحمية" },
    { id: 7, name: "الزلفي", nameAr: "الزلفي" }, { id: 8, name: "القويعية", nameAr: "القويعية" },
  ] },
  { id: 2, name: "مكة المكرمة", nameAr: "مكة المكرمة", cities: [
    { id: 10, name: "مكة المكرمة", nameAr: "مكة المكرمة" }, { id: 11, name: "جدة", nameAr: "جدة" },
    { id: 12, name: "الطائف", nameAr: "الطائف" }, { id: 13, name: "رابغ", nameAr: "رابغ" },
    { id: 14, name: "القنفذة", nameAr: "القنفذة" }, { id: 15, name: "الليث", nameAr: "الليث" },
  ] },
  { id: 3, name: "المنطقة الشرقية", nameAr: "المنطقة الشرقية", cities: [
    { id: 19, name: "الدمام", nameAr: "الدمام" }, { id: 20, name: "الخبر", nameAr: "الخبر" },
    { id: 21, name: "القطيف", nameAr: "القطيف" }, { id: 22, name: "الأحساء", nameAr: "الأحساء" },
    { id: 23, name: "الجبيل", nameAr: "الجبيل" }, { id: 24, name: "حفر الباطن", nameAr: "حفر الباطن" },
  ] },
  { id: 4, name: "منطقة المدينة المنورة", nameAr: "منطقة المدينة المنورة", cities: [
    { id: 27, name: "المدينة المنورة", nameAr: "المدينة المنورة" }, { id: 28, name: "ينبع", nameAr: "ينبع" },
    { id: 29, name: "العلا", nameAr: "العلا" }, { id: 30, name: "خيبر", nameAr: "خيبر" },
  ] },
  { id: 5, name: "منطقة عسير", nameAr: "منطقة عسير", cities: [
    { id: 32, name: "أبها", nameAr: "أبها" }, { id: 33, name: "خميس مشيط", nameAr: "خميس مشيط" },
    { id: 34, name: "بيشة", nameAr: "بيشة" }, { id: 35, name: "النماص", nameAr: "النماص" },
  ] },
  { id: 6, name: "منطقة القصيم", nameAr: "منطقة القصيم", cities: [
    { id: 37, name: "بريدة", nameAr: "بريدة" }, { id: 38, name: "عنيزة", nameAr: "عنيزة" },
    { id: 39, name: "الرس", nameAr: "الرس" }, { id: 40, name: "المذنب", nameAr: "المذنب" },
  ] },
  { id: 7, name: "منطقة جازان", nameAr: "منطقة جازان", cities: [
    { id: 42, name: "جازان", nameAr: "جازان" }, { id: 43, name: "صبيا", nameAr: "صبيا" },
    { id: 44, name: "أبو عريش", nameAr: "أبو عريش" },
  ] },
  { id: 8, name: "منطقة نجران", nameAr: "منطقة نجران", cities: [
    { id: 46, name: "نجران", nameAr: "نجران" }, { id: 47, name: "شرورة", nameAr: "شرورة" },
  ] },
  { id: 9, name: "منطقة حائل", nameAr: "منطقة حائل", cities: [
    { id: 49, name: "حائل", nameAr: "حائل" }, { id: 50, name: "بقعاء", nameAr: "بقعاء" },
  ] },
  { id: 10, name: "منطقة تبوك", nameAr: "منطقة تبوك", cities: [
    { id: 52, name: "تبوك", nameAr: "تبوك" }, { id: 53, name: "الوجه", nameAr: "الوجه" },
    { id: 54, name: "ضباء", nameAr: "ضباء" },
  ] },
]

export const DEMO_PRODUCTS = [
  {
    id: 1,
    type: "offer",
    title: "نقدم خدمة : تخليص جمركي في ميناء جدة الاسلامية",
    description: "خدمة تخليص جمركي متكاملة.",
    price: 110,
    currency: "SAR",
    location: "جدة",
    stats: { views: 2, messages: 2, comments: 2 },
    seller: { id: 1, name: "sky" },
    media: {
      image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400",
      gallery: ["a", "b", "c"],
    },
    published_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: "request",
    title: "طلب شحن بضائع أمن وسريع",
    description: "طلب شحن بضائع.",
    price: 110,
    currency: "SAR",
    location: "صفوة",
    stats: { views: 0, messages: 0, comments: 0 },
    seller: { id: 2, name: "عمر علي", is_company: true },
    company: { name: "Manfith / منفذ" },
    media: {},
    published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: "offer",
    title: "نقدم خدمة : تخليص جمركي في ميناء جدة الاسلامية",
    description: "خدمة تخليص جمركي متكاملة.",
    price: 110,
    currency: "SAR",
    location: "جدة",
    stats: { views: 2, messages: 2, comments: 2 },
    seller: { id: 1, name: "sky" },
    media: {
      image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400",
      gallery: ["a", "b"],
    },
    published_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: 4 + i,
    type: i % 3 === 0 ? "request" : "offer",
    title: `عرض أو طلب ${4 + i} - خدمة أو منتج`,
    description: "وصف.",
    price: 50 + i * 10,
    currency: "SAR",
    location: i % 2 === 0 ? "جدة" : "الرياض",
    stats: { views: i, messages: 0, comments: 0 },
    seller: { id: 1, name: "بائع" },
    media: { image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400", gallery: [] },
    published_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
  })),
]

export const DEMO_USER = {
  id: 1,
  name: "أحمد محمد",
  bio: "بائع موثوق - متخصص في الإلكترونيات والعقارات.",
  avatar_url: null,
  cover_photo_url: null,
  logo_url: null,
  financial_guarantee: 5000,
  verification_level: "id_verified",
  role: "seller",
  city: { id: 1, name: "الرياض", region: { id: 1, name: "الرياض" } },
  last_seen: "متصل الآن",
  listings_count: 4,
  sold_items: 45,
  active_listings: 4,
  reviews_avg: 4.8,
  reviews_count: 32,
  is_verified: true,
  email_verified: true,
  listings: DEMO_PRODUCTS.slice(0, 3),
  reviews: [],
}

export const DEMO_ANNOUNCEMENTS = [
  { id: 1, title: "مرحباً بكم في منصة عروض", content: "منصة موثوقة للعروض والطلبات.", is_active: true },
]

export const DEMO_COMPANIES = []
