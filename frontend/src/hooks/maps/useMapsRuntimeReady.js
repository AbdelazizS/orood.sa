import { useEffect, useState } from "react"
import { ensureMapsRuntimeConfig, isMapsRuntimeConfigReady } from "@/lib/maps/runtimeConfig"

/** Wait for /maps/config (fast no-op when already loaded). */
export function useMapsRuntimeReady() {
  const [ready, setReady] = useState(isMapsRuntimeConfigReady())

  useEffect(() => {
    if (ready) return
    let cancelled = false
    ensureMapsRuntimeConfig().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [ready])

  return ready
}
