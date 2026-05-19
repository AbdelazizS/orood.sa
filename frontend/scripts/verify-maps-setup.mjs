#!/usr/bin/env node
/**
 * Print map integration readiness (clone, env, style URL).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, "..")
const vendorDir = path.join(frontendRoot, "vendor", "manfith")
const manifestPath = path.join(frontendRoot, "src", "lib", "maps", "manfith-sdk.manifest.json")

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

function hasEnvToken() {
  const keys = ["VITE_MANFITH_MAP_PUBLIC_TOKEN", "VITE_MAPBOX_ACCESS_TOKEN"]
  for (const k of keys) {
    if (process.env[k]?.trim()) return { source: `process.env.${k}`, ok: true }
  }
  const envPath = path.join(frontendRoot, ".env")
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf8")
    for (const k of keys) {
      const m = text.match(new RegExp(`^${k}=(.+)$`, "m"))
      if (m?.[1]?.trim() && !m[1].trim().startsWith("pk.your")) {
        return { source: `.env ${k}`, ok: true }
      }
    }
  }
  return { source: "none", ok: false }
}

const cloned = fs.existsSync(path.join(vendorDir, ".git"))
const manifest = readJson(manifestPath)
const token = hasEnvToken()

console.log("\n=== Orood maps verify ===\n")
console.log(`vendor/manfith cloned: ${cloned ? "yes" : "no"}`)
console.log(`manifest cloned flag:  ${manifest?.cloned === true ? "true" : "false"}`)
console.log(`mapbox-gl (manifest):  ${manifest?.mapboxGlVersion ?? "—"}`)
console.log(`token configured:    ${token.ok ? "yes" : "no"} (${token.source})`)
if (manifest?.styleUrlsFound?.length) {
  console.log(`discovered styles:   ${manifest.styleUrlsFound[0]}`)
}
console.log("\nNext:")
if (!cloned) console.log("  npm run setup:manfith   (after gh auth login)")
if (!token.ok) console.log("  Set VITE_MANFITH_MAP_PUBLIC_TOKEN in frontend/.env")
console.log("  npm run dev → http://localhost:5173/maps-test")
console.log("")

process.exit(cloned && token.ok ? 0 : 1)
