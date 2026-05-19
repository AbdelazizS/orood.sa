import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { resolveSeo } from "@/services/seoService"

export function useResolvedSeo(path, context = {}, options = {}) {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith("en") ? "en" : "ar"

  return useQuery({
    queryKey: ["seo-resolve", path, lang, JSON.stringify(context)],
    queryFn: () => resolveSeo(path, { lang, ...context }),
    staleTime: 1000 * 60 * 10,
    enabled: Boolean(path) && (options.enabled ?? true),
  })
}
