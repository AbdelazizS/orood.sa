import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "@/locales/en.json"
import ar from "@/locales/ar.json"

const STORAGE_KEY = "arooth-lang"

const resources = {
  en: { translation: en },
  ar: { translation: ar },
}

const savedLang = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
const initialLang = savedLang && (savedLang === "en" || savedLang === "ar") ? savedLang : "ar"

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: ["ar", "en"],
  interpolation: {
    escapeValue: false,
  },
})

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lng)
  }
})

export const isRTL = (lang) => lang === "ar"
export const setDocumentDirection = (lang) => {
  const dir = isRTL(lang) ? "rtl" : "ltr"
  document.documentElement.dir = dir
  document.documentElement.lang = lang
  document.documentElement.setAttribute("dir", dir)
}

// Apply on init
setDocumentDirection(i18n.language)
i18n.on("languageChanged", setDocumentDirection)

export default i18n
