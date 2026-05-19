import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchWholesalePageSettings } from "@/services/wholesaleService"

export function useWholesalePageSettings() {
  return useQuery({
    queryKey: ["wholesale", "page-settings"],
    queryFn: fetchWholesalePageSettings,
    staleTime: 60_000,
  })
}

/**
 * @param {object|null|undefined} settings API `wholesale_market_page` payload
 * @param {import("i18next").i18n} i18n
 * @param {import("i18next").TFunction} t
 * @returns {(field: string, fallbackKey: string) => string}
 */
export function useWholesaleCopyResolver(settings, i18n, t) {
  return useMemo(() => {
    const lang = i18n.language?.startsWith("ar") ? "ar" : "en"
    const block = settings?.copy?.[lang] ?? {}
    return (field, fallbackKey) => {
      const v = block[field]
      if (typeof v === "string" && v.trim() !== "") return v.trim()
      return t(fallbackKey)
    }
  }, [settings, i18n.language, t])
}
