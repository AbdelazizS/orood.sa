const VIEW_STORAGE_KEY = "wholesale.market.view"

/** List (Haraj-style rows) */
const VIEW_LIST = "feed"
/** Grid (image on top, premium card) */
const VIEW_GRID = "vertical"

const ALLOWED_VIEWS = new Set([VIEW_LIST, VIEW_GRID])

/** Map removed layout modes and legacy keys to grid. */
export function normalizeWholesaleViewParam(value) {
  if (value === VIEW_LIST || value === VIEW_GRID) return value
  if (value === "horizontal" || value === "compact" || value === "grid") return VIEW_GRID
  if (value === "list") return VIEW_LIST
  return VIEW_LIST
}

export function isWholesaleView(value) {
  return typeof value === "string" && ALLOWED_VIEWS.has(value)
}

export function readStoredWholesaleView() {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY)
    const normalized = normalizeWholesaleViewParam(v)
    return isWholesaleView(normalized) ? normalized : null
  } catch {
    return null
  }
}

export function persistWholesaleView(view) {
  if (!isWholesaleView(view)) return
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  } catch {
    /* ignore */
  }
}
