/**
 * Demo data for standalone frontend when backend is unavailable.
 * Set VITE_USE_DEMO=true to enable. Remove or set false for real deployment.
 */

export const DEMO_CATEGORIES = [
  { id: 1, name: "إلكترونيات", name_en: "Electronics", subcategories: [{ id: 1, name: "هواتف" }, { id: 2, name: "لابتوب" }] },
  { id: 2, name: "سيارات", name_en: "Cars", subcategories: [{ id: 3, name: "سيدان" }, { id: 4, name: "دفع رباعي" }] },
  { id: 3, name: "عقارات", name_en: "Real Estate", subcategories: [{ id: 5, name: "شقق" }, { id: 6, name: "فلل" }] },
  { id: 4, name: "أثاث", name_en: "Furniture", subcategories: [{ id: 7, name: "غرف نوم" }, { id: 8, name: "صالون" }] },
]

export const DEMO_REGIONS = [
  {
    id: 1,
    name: "الرياض",
    name_en: "Riyadh",
    cities: [
      { id: 1, name: "الرياض", name_en: "Riyadh" },
      { id: 2, name: "الخرج", name_en: "Al-Kharj" },
    ],
  },
  {
    id: 2,
    name: "مكة المكرمة",
    name_en: "Makkah",
    cities: [
      { id: 3, name: "جدة", name_en: "Jeddah" },
      { id: 4, name: "مكة", name_en: "Makkah" },
    ],
  },
  {
    id: 3,
    name: "الشرقية",
    name_en: "Eastern Province",
    cities: [
      { id: 5, name: "الدمام", name_en: "Dammam" },
      { id: 6, name: "الخبر", name_en: "Khobar" },
    ],
  },
]

export const DEMO_PRODUCTS = [
  {
    id: 1,
    type: "offer",
    title: "آيفون 15 برو ماكس - جديد",
    description: "آيفون 15 برو ماكس 256 جيجا، اللون الأزرق الطبيعي. لم يستخدم إلا شهرين.",
    price: 4500,
    currency: "SAR",
    condition: "new",
    warranty: "3 أشهر",
    is_offer: true,
    accept_bids: false,
    location: "الرياض",
    stats: { views: 234, purchases: 0, messages: 12, bids: 0, comments: 5 },
    seller: { id: 1, name: "أحمد محمد", last_seen: "متصل الآن", completed_orders: 45 },
    category: { id: 1, name: "إلكترونيات" },
    subcategory: { id: 1, name: "هواتف" },
    media: { image_url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400", gallery: [] },
    published_at: "2025-01-15T10:00:00Z",
  },
  {
    id: 2,
    type: "request",
    title: "أبحث عن لابتوب للبرمجة",
    description: "أبحث عن لابتوب بمواصفات جيدة للبرمجة، RAM 16 على الأقل.",
    price: null,
    currency: "SAR",
    condition: "used",
    is_offer: false,
    accept_bids: true,
    location: "جدة",
    stats: { views: 89, purchases: 0, messages: 8, bids: 3, comments: 2 },
    seller: { id: 2, name: "سارة علي", last_seen: "منذ ساعة", completed_orders: 12 },
    category: { id: 1, name: "إلكترونيات" },
    subcategory: { id: 2, name: "لابتوب" },
    media: { image_url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400", gallery: [] },
    published_at: "2025-01-14T14:00:00Z",
  },
  {
    id: 3,
    type: "offer",
    title: "تويوتا كامري 2022",
    description: "تويوتا كامري فول أوبشن، اللون أبيض لؤلؤي. حالة ممتازة.",
    price: 85000,
    currency: "SAR",
    condition: "used",
    is_offer: true,
    accept_bids: false,
    location: "الدمام",
    stats: { views: 567, purchases: 0, messages: 34, bids: 0, comments: 8 },
    seller: { id: 3, name: "خالد العتيبي", last_seen: "متصل الآن", completed_orders: 78 },
    category: { id: 2, name: "سيارات" },
    subcategory: { id: 3, name: "سيدان" },
    media: { image_url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400", gallery: [] },
    published_at: "2025-01-13T09:00:00Z",
  },
  {
    id: 4,
    type: "offer",
    title: "غرفة نوم كاملة - خشب طبيعي",
    description: "غرفة نوم 5 قطع، خشب زان طبيعي. مستعملة بحالة جيدة.",
    price: 3500,
    currency: "SAR",
    condition: "used",
    is_offer: true,
    accept_bids: true,
    location: "الرياض",
    stats: { views: 145, purchases: 0, messages: 6, bids: 2, comments: 1 },
    seller: { id: 1, name: "أحمد محمد", last_seen: "منذ ٣ ساعات", completed_orders: 45 },
    category: { id: 4, name: "أثاث" },
    subcategory: { id: 7, name: "غرف نوم" },
    media: { image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400", gallery: [] },
    published_at: "2025-01-12T16:00:00Z",
  },
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
