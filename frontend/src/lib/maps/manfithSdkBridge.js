/**
 * Bridge to Manfith repo checkout (vendor/manfith) + generated manifest.
 * Run: npm run setup:manfith && npm run discover:manfith
 */
import manifest from "./manfith-sdk.manifest.json"

export function getManfithSdkManifest() {
  return manifest
}

export function isManfithVendorCloned() {
  return Boolean(manifest?.cloned)
}

/** Human-readable setup hint when engine=manfith but token missing */
export function getManfithSetupHint() {
  if (!isManfithVendorCloned()) {
    return "Run: cd frontend && npm run setup:manfith"
  }
  const keys = manifest.tokenEnvKeys?.[0]
  if (keys) {
    return `Copy Manfith env \`${keys}\` → VITE_MANFITH_MAP_PUBLIC_TOKEN in frontend/.env`
  }
  return "Set VITE_MANFITH_MAP_PUBLIC_TOKEN in frontend/.env (see docs/MANFITH_ENV_MAPPING.md)"
}

/**
 * Prefer explicit Orood env; optional default style from discovered Manfith repo.
 */
export function resolveDiscoveredStyleUrl() {
  const found = manifest.styleUrlsFound?.[0]
  if (typeof found === "string" && found.trim()) return found.trim()
  return null
}
