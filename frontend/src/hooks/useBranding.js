import { useCallback, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  fetchAdminBranding,
  fetchPublicBranding,
  updateBranding,
  uploadBrandingAsset,
} from "@/services/brandingService"
import { readBrandingCache, writeBrandingCache } from "@/lib/brandingCache"
import { resolveImageUrl } from "@/lib/imageUrl"
import { useTheme } from "@/providers/ThemeProvider"

const PLACEMENT_MAP = {
  navbar: "navbar",
  nav: "navbar",
  sidebar: "sidebar",
  footer: "footer",
  preloader: "preloader",
  auth: "auth",
  mobileNav: "mobile_nav",
  mobile_nav: "mobile_nav",
}

export const BRANDING_FALLBACK = {
  assets: {
    logo_light: "/logo.png",
    logo_dark: "/logo.png",
    logo_footer: "/logo.png",
    logo_preloader_mark: "/favicon.png",
    favicon: "/favicon.png",
    app_icon: "/favicon.png",
  },
  placements: {
    navbar: {
      width: "13.75rem",
      widthDesktop: "17.5rem",
      maxHeight: "4rem",
      objectFit: "contain",
      padding: "0.125rem",
    },
    sidebar: {
      width: "2.75rem",
      height: "2.75rem",
      maxHeight: "2.75rem",
      objectFit: "contain",
      padding: "0",
    },
    footer: { width: "8.75rem", maxHeight: "3rem", objectFit: "contain", padding: "0" },
    preloader: { width: "7.5rem", maxHeight: "7.5rem", objectFit: "contain", padding: "0" },
    auth: { width: "12.5rem", maxHeight: "3rem", objectFit: "contain", padding: "0.5rem" },
    mobile_nav: { width: "13.75rem", maxHeight: "4rem", objectFit: "contain", padding: "0.125rem" },
  },
  legal: {
    copyright_ar: "منصة عروض © {year} — جميع الحقوق محفوظة",
    copyright_en: "Orood Platform © {year} — All rights reserved.",
  },
  footer: {
    show_developer_credit: true,
    developer_name: "Aziz",
    developer_linkedin_url: "https://www.linkedin.com/in/abdelaziz-elrasheed-3b1748257",
    footer_tagline: "Trusted marketplace for offers, requests, and wholesale",
    violation_notice: "",
  },
}

const FALLBACK = BRANDING_FALLBACK

function normalizePlacement(placement) {
  return PLACEMENT_MAP[placement] ?? placement
}

/** Uploaded assets live under /storage; static defaults are /logo.png or /favicon.png */
export function isCustomBrandingUrl(url) {
  if (!url || typeof url !== "string") return false
  const u = url.trim()
  return (
    u.startsWith("/storage") ||
    u.includes("/storage/branding") ||
    u.includes("/branding/")
  )
}

export function brandingQueryKey(locale) {
  const lang = typeof locale === "string" && locale.startsWith("en") ? "en" : "ar"
  return ["branding", lang]
}

/** Sidebar, browser tab — favicon / app icon only (never preloader mark). */
export function resolveFaviconUrl(assets) {
  const a = assets ?? FALLBACK.assets
  if (isCustomBrandingUrl(a.favicon)) return a.favicon
  if (isCustomBrandingUrl(a.app_icon)) return a.app_icon
  return a.favicon || a.app_icon || FALLBACK.assets.favicon
}

/** Splash screen only — preloader mark upload (no favicon fallback). */
export function resolvePreloaderMarkUrl(assets) {
  const a = assets ?? FALLBACK.assets
  if (isCustomBrandingUrl(a.logo_preloader_mark)) return a.logo_preloader_mark
  return a.logo_preloader_mark || FALLBACK.assets.logo_preloader_mark
}

export function useBranding() {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const locale = i18n.language?.startsWith("en") ? "en" : "ar"

  const query = useQuery({
    queryKey: brandingQueryKey(locale),
    queryFn: async () => {
      const data = await fetchPublicBranding()
      writeBrandingCache(locale, data)
      return data
    },
    staleTime: 5 * 60 * 1000,
    initialData: () => readBrandingCache(locale),
  })

  const branding = query.data ?? readBrandingCache(locale) ?? FALLBACK
  const assets = branding.assets ?? FALLBACK.assets
  const placements = branding.placements ?? FALLBACK.placements
  const legal = branding.legal ?? FALLBACK.legal
  const footer = branding.footer ?? FALLBACK.footer

  const assetFor = useCallback(
    (placement, variant) => {
      const key = normalizePlacement(placement)
      if (variant === "light") {
        return assets.logo_light || FALLBACK.assets.logo_light
      }
      if (variant === "dark") {
        return assets.logo_dark || assets.logo_light || FALLBACK.assets.logo_dark
      }

      if (key === "sidebar" || variant === "favicon") {
        return resolveFaviconUrl(assets)
      }

      if (key === "preloader") {
        return resolvePreloaderMarkUrl(assets)
      }

      if (key === "footer" && assets.logo_footer) {
        return assets.logo_footer
      }

      if (variant === "dark" || (variant !== "light" && theme === "dark")) {
        return assets.logo_dark || assets.logo_light || FALLBACK.assets.logo_light
      }

      return assets.logo_light || assets.logo_dark || FALLBACK.assets.logo_light
    },
    [assets, theme],
  )

  const styleFor = useCallback(
    (placement) => {
      const key = normalizePlacement(placement)
      return placements[key] ?? FALLBACK.placements[key] ?? FALLBACK.placements.navbar
    },
    [placements],
  )

  const copyrightLine = useCallback(() => {
    const year = new Date().getFullYear()
    const template =
      locale === "en"
        ? legal.copyright_en || legal.copyright || FALLBACK.legal.copyright_en
        : legal.copyright_ar || legal.copyright || FALLBACK.legal.copyright_ar
    return String(template).replace("{year}", String(year))
  }, [legal, locale])

  const footerTagline = useCallback(() => {
    return footer.footer_tagline || FALLBACK.footer.footer_tagline || ""
  }, [footer])

  const developerCredit = useCallback(() => {
    const show = footer.show_developer_credit ?? FALLBACK.footer.show_developer_credit
    const name = footer.developer_name || FALLBACK.footer.developer_name
    const linkedinUrl =
      footer.developer_linkedin_url || FALLBACK.footer.developer_linkedin_url

    return {
      show: Boolean(show),
      name: name || "",
      linkedinUrl: linkedinUrl || "",
    }
  }, [footer])

  const faviconHref = resolveImageUrl(resolveFaviconUrl(assets))
  const appIconHref = resolveImageUrl(
    assets.app_icon || assets.favicon || FALLBACK.assets.favicon,
  )
  const preloaderMarkSrc = resolveImageUrl(resolvePreloaderMarkUrl(assets))

  return useMemo(
    () => ({
      ...query,
      branding,
      assets,
      assetFor,
      styleFor,
      copyrightLine,
      footerTagline,
      developerCredit,
      faviconHref,
      appIconHref,
      preloaderMarkSrc,
    }),
    [
      query,
      branding,
      assets,
      assetFor,
      styleFor,
      copyrightLine,
      footerTagline,
      developerCredit,
      faviconHref,
      appIconHref,
      preloaderMarkSrc,
    ],
  )
}

export function useAdminBranding() {
  return useQuery({
    queryKey: ["admin", "branding"],
    queryFn: fetchAdminBranding,
  })
}

export function useUpdateBranding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBranding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "branding"] })
      queryClient.invalidateQueries({ queryKey: ["branding"] })
    },
  })
}

export function useUploadBrandingAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, assetKey }) => uploadBrandingAsset(file, assetKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "branding"] })
      queryClient.invalidateQueries({ queryKey: ["branding"] })
    },
  })
}
