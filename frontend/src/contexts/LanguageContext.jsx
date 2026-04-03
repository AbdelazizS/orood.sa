import { createContext, useContext, useMemo } from "react"
import i18n from "@/lib/i18n"
import { useTranslation as useI18nTranslation } from "react-i18next"

const LanguageContext = createContext({
  language: "ar",
  direction: "rtl",
  setLanguage: () => {},
  toggleLanguage: () => {},
})

export function LanguageProvider({ children }) {
  const { i18n: i18next } = useI18nTranslation()
  const language = i18next.language?.startsWith("ar") ? "ar" : "en"
  const direction = language === "ar" ? "rtl" : "ltr"

  const value = useMemo(
    () => ({
      language,
      direction,
      setLanguage: (lang) => i18n.changeLanguage(lang === "ar" ? "ar" : "en"),
      toggleLanguage: () => i18n.changeLanguage(language === "ar" ? "en" : "ar"),
    }),
    [direction, language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
