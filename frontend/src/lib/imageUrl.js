/**
 * Resolve image URL for display.
 * Handles backend URLs (e.g. http://localhost:8000/storage/...) when frontend
 * runs on different port — use pathname so Vite proxy can serve it.
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== "string") return ""
  if (url.startsWith("blob:")) return url
  if (url.startsWith("data:")) return url
  try {
    const parsed = new URL(url, window.location.origin)
    // If backend is on different origin (e.g. :8000 vs :5173), use pathname
    // so Vite proxy (/storage -> backend) can serve the image
    if (parsed.origin !== window.location.origin && parsed.pathname.startsWith("/storage")) {
      return parsed.pathname
    }
    return url
  } catch {
    if (url.startsWith("/")) return url
    return `${window.location.origin}/${url.replace(/^\//, "")}`
  }
}
