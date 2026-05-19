import { useEffect } from "react"
import { ensureMapsRuntimeConfig } from "@/lib/maps/runtimeConfig"

/** Prefetch public map tokens from the API so pickers work without a frontend rebuild. */
export function MapsConfigInit() {
  useEffect(() => {
    ensureMapsRuntimeConfig()
  }, [])
  return null
}
