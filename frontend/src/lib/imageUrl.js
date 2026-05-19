/**
 * Resolve storage/API asset URLs for display and download.
 * Normalizes Laravel public disk paths and cross-origin dev URLs (Vite proxy).
 */
export function resolveImageUrl(url) {
  const resolved = resolveAssetUrl(url)
  if (!resolved) return ""

  // img/src often work with relative /storage paths; keep relative when on same host
  try {
    const parsed = new URL(resolved, typeof window !== "undefined" ? window.location.origin : undefined)
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    if (origin && parsed.origin !== origin && parsed.pathname.startsWith("/storage")) {
      return parsed.pathname
    }
  } catch {
    /* use resolved */
  }

  return resolved
}

/**
 * Absolute URL for links (open receipt in new tab, download).
 */
export function resolveAssetUrl(url) {
  if (!url || typeof url !== "string") return ""
  const trimmed = url.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed
  }

  const origin = typeof window !== "undefined" ? window.location.origin : ""

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.pathname.startsWith("/storage")) {
        return `${origin}${parsed.pathname}${parsed.search}`
      }
      return trimmed
    } catch {
      return trimmed
    }
  }

  let path = trimmed
  if (!path.startsWith("/")) {
    path = `/${path}`
  }
  if (path.startsWith("/uploads/")) {
    path = `/storage${path}`
  } else if (!path.startsWith("/storage") && path.includes("/uploads/")) {
    path = `/storage/${path.replace(/^\//, "")}`
  } else if (!path.startsWith("/storage") && !path.startsWith("/api")) {
    // bare storage-relative path
    if (path.match(/\.(pdf|jpe?g|png|webp|gif)(\?|$)/i)) {
      path = path.startsWith("/storage/") ? path : `/storage${path}`
    }
  }

  return `${origin}${path}`
}

export function looksLikeAssetUrl(val) {
  if (!val || typeof val !== "string") return false
  const v = val.trim()
  if (v.length < 8) return false
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("/storage") ||
    v.startsWith("storage/") ||
    v.startsWith("/uploads") ||
    v.startsWith("uploads/") ||
    /\.(pdf|jpe?g|png|webp|gif)(\?.*)?$/i.test(v)
  )
}

export function isPdfAssetUrl(url) {
  if (!url) return false
  return /\.pdf(\?.*)?$/i.test(url.split("?")[0] ?? "")
}
