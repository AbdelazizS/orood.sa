/**
 * Hardcoded data for Add Listing page — Mstmel/Haraj style.
 * Saudi regions, cities, and product categories.
 */

export const MAIN_CATEGORIES = [
  { id: 1, name: "سيارات ومركبات", icon: "Car", subcategories: [] },
  { id: 2, name: "جوالات وأرقام", icon: "Smartphone", subcategories: [] },
  { id: 3, name: "أثاث وديكور", icon: "Sofa", subcategories: [
    { id: 1, name: "أثاث منزلي" },
    { id: 2, name: "كنب" },
    { id: 3, name: "أثاث مكتبي" },
    { id: 4, name: "طاولات وكراسي" },
    { id: 5, name: "أسرة ومراتب" },
    { id: 6, name: "دواليب وخزائن" },
    { id: 7, name: "ديكور وتحف وزينة" },
    { id: 8, name: "أثاث خارجي" },
    { id: 9, name: "مفروشات" },
  ]},
  { id: 4, name: "أجهزة والكترونيات", icon: "Monitor", subcategories: [] },
  { id: 5, name: "ملابس وأزياء", icon: "Shirt", subcategories: [] },
  { id: 6, name: "صناعات وتقليات", icon: "Factory", subcategories: [] },
  { id: 7, name: "كمبيوتر وإنترنت", icon: "Laptop", subcategories: [] },
  { id: 8, name: "أخرى", icon: "Package", subcategories: [] },
]

export const SAUDI_REGIONS = [
  { id: 1, name: "منطقة الرياض", cities: [
    { id: 1, name: "الرياض" }, { id: 2, name: "الخرج" }, { id: 3, name: "الدرعية" },
    { id: 4, name: "الدوادمي" }, { id: 5, name: "المجمعة" }, { id: 6, name: "المزاحمية" },
    { id: 7, name: "الزلفي" }, { id: 8, name: "القويعية" },     { id: 9, name: "وادي الدواسر" }, { id: 65, name: "الأفلاج" },
  ]},
  { id: 2, name: "مكة المكرمة", cities: [
    { id: 10, name: "مكة" }, { id: 11, name: "جدة" }, { id: 12, name: "الطائف" },
    { id: 13, name: "القنفذة" }, { id: 14, name: "الليث" }, { id: 15, name: "خليص" },
    { id: 16, name: "رابغ" }, { id: 17, name: "تربة" }, { id: 18, name: "رنية" },
  ]},
  { id: 3, name: "المنطقة الشرقية", cities: [
    { id: 19, name: "الدمام" }, { id: 20, name: "الخبر" }, { id: 21, name: "القطيف" },
    { id: 22, name: "الأحساء" }, { id: 23, name: "الجبيل" }, { id: 24, name: "حفر الباطن" },
    { id: 25, name: "الخفجي" }, { id: 26, name: "رأس تنورة" },
  ]},
  { id: 4, name: "منطقة المدينة", cities: [
    { id: 27, name: "المدينة المنورة" }, { id: 28, name: "ينبع" }, { id: 29, name: "العلا" },
    { id: 30, name: "خيبر" }, { id: 31, name: "المهد" },
  ]},
  { id: 5, name: "منطقة عسير", cities: [
    { id: 32, name: "أبها" }, { id: 33, name: "خميس مشيط" }, { id: 34, name: "بيشة" },
    { id: 35, name: "النماص" }, { id: 36, name: "سراة عبيدة" },
  ]},
  { id: 6, name: "منطقة القصيم", cities: [
    { id: 37, name: "بريدة" }, { id: 38, name: "عنيزة" }, { id: 39, name: "الرس" },
    { id: 40, name: "المذنب" }, { id: 41, name: "البكيرية" },
  ]},
  { id: 7, name: "منطقة جازان", cities: [
    { id: 42, name: "جازان" }, { id: 43, name: "صبيا" }, { id: 44, name: "أبو عريش" },
    { id: 45, name: "صامطة" },
  ]},
  { id: 8, name: "منطقة نجران", cities: [
    { id: 46, name: "نجران" }, { id: 47, name: "شرورة" }, { id: 48, name: "حبونا" },
  ]},
  { id: 9, name: "منطقة حائل", cities: [
    { id: 49, name: "حائل" }, { id: 50, name: "بقعاء" }, { id: 51, name: "الغزالة" },
  ]},
  { id: 10, name: "منطقة تبوك", cities: [
    { id: 52, name: "تبوك" }, { id: 53, name: "الوجه" }, { id: 54, name: "ضباء" },
    { id: 55, name: "تيماء" },
  ]},
  { id: 11, name: "منطقة الحدود الشمالية", cities: [
    { id: 56, name: "عرعر" }, { id: 57, name: "طريف" }, { id: 58, name: "العويقيلة" },
  ]},
  { id: 12, name: "منطقة الجوف", cities: [
    { id: 59, name: "سكاكا" }, { id: 60, name: "دومة الجندل" }, { id: 61, name: "طبرجل" },
  ]},
  { id: 13, name: "منطقة الباحة", cities: [
    { id: 62, name: "الباحة" }, { id: 63, name: "بلجرشي" }, { id: 64, name: "المندق" },
  ]},
]
