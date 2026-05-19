import { getManfithStyleUrl } from "@/lib/maps/token"

/** @param {'light' | 'dark'} themeMode */
export function resolveMapboxStyle(themeMode = "light") {
  return getManfithStyleUrl(themeMode)
}
