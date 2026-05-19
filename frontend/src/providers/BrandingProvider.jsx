import { useEffect } from "react"
import { resolveImageUrl } from "@/lib/imageUrl"
import { useBranding } from "@/hooks/useBranding"

function upsertLink(rel, href) {
  if (!href) return
  const resolved = resolveImageUrl(href)
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
