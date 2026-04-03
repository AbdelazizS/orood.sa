/**
 * Add Listing page data — PDF spec (pages 2–5).
 * Uses addListingData for API-compatible IDs; adds emoji icons and OPTIONS.
 */
import { MAIN_CATEGORIES as RAW_CATEGORIES, SAUDI_REGIONS as RAW_REGIONS } from "./addListingData"

const EMOJI_BY_ID = {
  1: "🚗",
  2: "📱",
  3: "🛋️",
  4: "💻",
  5: "👗",
  6: "🏭",
  7: "🖥️",
  8: "📦",
}

export const MAIN_CATEGORIES = RAW_CATEGORIES.map((c) => ({
  ...c,
  label: c.name,
  icon: EMOJI_BY_ID[c.id] ?? "📦",
  subcategories: (c.subcategories ?? []).map((s) => ({ ...s, label: s.name })),
}))

export const SAUDI_REGIONS = RAW_REGIONS.map((r) => ({
  ...r,
  label: r.name,
  cities: (r.cities ?? []).map((c) => ({ ...c, label: c.name })),
}))

export const OPTIONS = [
  {
    name: "freeShipping",
    label: "الشحن المنتج مجانا",
    subLabel: "- استرجاع المنتج مجانا نفس اليوم أو ( ) يوما",
    hasDaysInput: true,
  },
  {
    name: "viewAtLocation",
    label: "مشاهدة المنتج في موقع العميل",
    subLabel: null,
  },
  {
    name: "showComments",
    label: "إظهار التعليقات في العامة",
    subLabel: null,
  },
  {
    name: "contactByCall",
    label: "التواصل - من خلال جوال ( )",
    subLabel: "التواصل عبر مكالمة",
    hasPhoneInput: true,
  },
  {
    name: "contactByMessage",
    label: "الرسائل في المنصة",
    subLabel: null,
  },
  {
    name: "biddingEnabled",
    label: "عرض السعر من العملاء ( السوم ) ظاهر خفي",
    subLabel: null,
    hasVisibilityToggle: true,
  },
  {
    name: "noPlatformFee",
    label: "لايوجد رسوم منصة على البائع أو المشتري في الوقت الحالي",
    subLabel: null,
    disabled: true,
    defaultChecked: true,
  },
]
