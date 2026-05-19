import { useEffect, useRef, useState } from "react"
import { initializeMap } from "@/lib/maps/manfithAdapter"
import { useTheme } from "@/providers/ThemeProvider"
import { usePrefersReducedMotion } from "@/hooks/maps/useMapInteractions"

/**
 * Map lifecycle hook: init, resize, theme style, destroy.
 * @param {import('react').RefObject<HTMLElement|null>} containerRef
 * @param {{ zoom?: number, language?: string, interactive?: boolean, enabled?: boolean }} [options]
 */
export function useMapInstance(containerRef, options = {}) {
  const { theme } = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const apiRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const enabled = options.enabled !== false

  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return undefined

    let cancelled = false
    setError(null)
    setReady(false)

    initializeMap(el, {
      zoom: options.zoom ?? 11,
      language: options.language,
      interactive: options.interactive !== false,
      themeMode: theme === "dark" ? "dark" : "light",
    })
      .then((api) => {
        if (cancelled) {
          api.destroy()
          return
        }
        apiRef.current = api
        if (reducedMotion && api.map) {
          const ease = api.map.easeTo.bind(api.map)
          api.map.easeTo = (opts) => ease({ ...opts, duration: 0 })
        }
        setReady(true)
        requestAnimationFrame(() => api.resize())
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
      setReady(false)
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, options.language, options.zoom, options.interactive, theme])

  return { api: apiRef, ready, error, mapsReady: ready }
}
