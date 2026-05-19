const RTL_PLUGIN_URL =
  "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js"

let rtlPromise = null

/** Load Mapbox RTL text plugin once (Arabic labels). */
export function ensureRtlTextPlugin(mapboxgl) {
  if (!mapboxgl?.setRTLTextPlugin) return Promise.resolve()
  if (rtlPromise) return rtlPromise
  rtlPromise = new Promise((resolve) => {
    const finish = () => resolve()
    const timeout = setTimeout(finish, 8000)
    try {
      mapboxgl.setRTLTextPlugin(
        RTL_PLUGIN_URL,
        (err) => {
          clearTimeout(timeout)
          if (err && import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn("[maps] RTL plugin:", err)
          }
          finish()
        },
        true
      )
    } catch {
      clearTimeout(timeout)
      finish()
    }
  })
  return rtlPromise
}

export function resetRtlPluginForTests() {
  rtlPromise = null
}
