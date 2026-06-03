import { useEffect } from "react"
import { resolveImageUrl } from "@/lib/imageUrl"
import { useBranding } from "@/hooks/useBranding"

function cacheBustHref(href) {
  if (!href || !href.includes("/storage/")) return href
  const sep = href.includes("?") ? "&" : "?"
  let hash = 0
  for (let i = 0; i < href.length; i += 1) {
    hash = (hash << 5) - hash + href.charCodeAt(i)
    hash |= 0
  }
  return `${href}${sep}v=${Math.abs(hash)}`
}

function upsertLink(rel, href) {
  if (!href) return
  const resolved = cacheBustHref(resolveImageUrl(href))
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement("link")
    el.rel = rel
    document.head.appendChild(el)
  }
  if (el.getAttribute("href") !== resolved) {
    el.setAttribute("href", resolved)
  }
}

/** Syncs favicon / apple-touch-icon from public branding API. */
export function BrandingProvider({ children }) {
  const { faviconHref, appIconHref, isSuccess } = useBranding()

  useEffect(() => {
    if (!isSuccess) return
    upsertLink("icon", faviconHref)
    upsertLink("apple-touch-icon", appIconHref)
  }, [faviconHref, appIconHref, isSuccess])

  return children
}
