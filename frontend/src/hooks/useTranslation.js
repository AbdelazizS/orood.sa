import { useTranslation as useI18nTranslation } from "react-i18next"
import { useLanguage } from "@/contexts/LanguageContext"

export function useTranslation() {
  const { t, i18n } = useI18nTranslation()
  const { language, direction } = useLanguage()

  return {
    t,
    i18n,
    language,
    direction,
    isArabic: language === "ar",
    isEnglish: language === "en",
  }
}
