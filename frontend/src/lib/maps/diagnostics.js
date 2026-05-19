import { isManfithMapConfigured } from "@/lib/maps/token"

const timings = new Map()

export function mapDiagnosticsEnabled() {
  return import.meta.env.DEV
}

export function mapDiagStart(label) {
  if (!mapDiagnosticsEnabled()) return
  timings.set(label, performance.now())
}

export function mapDiagEnd(label) {
  if (!mapDiagnosticsEnabled()) return
  const start = timings.get(label)
  if (start == null) return
  timings.delete(label)
  // eslint-disable-next-line no-console
  console.debug(`[maps] ${label}: ${Math.round(performance.now() - start)}ms`)
}

export function logMapDiagnostics(context = "") {
  if (!mapDiagnosticsEnabled()) return
  // eslint-disable-next-line no-console
  console.debug("[maps] diagnostics", {
    context,
    tokenConfigured: isManfithMapConfigured(),
    engine: import.meta.env.VITE_MAP_ENGINE ?? "(auto)",
  })
}
