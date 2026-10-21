const RTL_PLUGIN_URL =
  "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js"

let rtlPromise = null

/**
 * Register the Mapbox RTL text plugin once (Arabic labels).
 * Registered lazily: Mapbox fetches it the first time it renders RTL text, and the callback only
 * fires then — so we must not wait for it (doing so stalled every map ~8s on the old timeout).
 */
export function ensureRtlTextPlugin(mapboxgl) {
  if (!mapboxgl?.setRTLTextPlugin) return Promise.resolve()
  if (rtlPromise) return rtlPromise
  try {
    mapboxgl.setRTLTextPlugin(
      RTL_PLUGIN_URL,
      (err) => {
        if (err && import.meta.env.DEV) {
          console.warn("[maps] RTL plugin:", err)
        }
      },
      true
    )
  } catch {
    /* already registered (HMR) or unsupported */
  }
  rtlPromise = Promise.resolve()
  return rtlPromise
}

export function resetRtlPluginForTests() {
  rtlPromise = null
}
