import { useTranslation } from "react-i18next"
import seoRoutes from "@/config/seo/routes.json"

/**
 * Central SEO defaults per route key (e.g. "legal.privacy-policy", "home").
 */
export function usePageSeo(routeKey, overrides = {}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith("en") ? "en" : "ar"
  const base = seoRoutes?.[routeKey]?.[lang] ?? seoRoutes?.[routeKey]?.ar ?? {}

  const titleKey = base.titleKey ?? `seo.routes.${routeKey}.title`
  const descKey = base.descriptionKey ?? `seo.routes.${routeKey}.description`

  return {
    title: overrides.title ?? t(titleKey, base.title ?? ""),
    description: overrides.description ?? t(descKey, base.description ?? ""),
    robots: overrides.robots ?? base.robots,
    canonical: overrides.canonical ?? base.canonical,
  }
}
