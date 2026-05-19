import { useMemo } from "react"

/** Reserved for debounced address → coords flows; pickers use Places / map clicks today. */
export function useReverseGeocodePlaceholder() {
  return useMemo(() => ({ ready: false }), [])
}
