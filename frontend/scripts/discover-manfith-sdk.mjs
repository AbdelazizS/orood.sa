#!/usr/bin/env node
/**
 * Scan vendor/manfith for Mapbox env keys, style URLs, and package versions.
 * Writes src/lib/maps/manfith-sdk.manifest.json and docs/MANFITH_ENV_MAPPING.md
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, "..")
const vendorDir = path.join(frontendRoot, "vendor", "manfith")
const manifestPath = path.join(frontendRoot, "src", "lib", "maps", "manfith-sdk.manifest.json")
const mappingDocPath = path.join(frontendRoot, "docs", "MANFITH_ENV_MAPPING.md")

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "vendor",
  "coverage",
])

const ENV_FILE_NAMES = [".env.example", ".env.sample", ".env.template", "env.example"]

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(name.name)) continue
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8")
  } catch {
    return ""
  }
}

function extractEnvKeys(text) {
  const keys = new Set()
  const re = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm
  let m
  while ((m = re.exec(text)) !== null) keys.add(m[1])
  return [...keys]
}

function filterMapKeys(keys) {
  const re = /(MAP|MAPBOX|MANFITH|STYLE|TILE|GEO)/i
  return keys.filter((k) => re.test(k))
}

function findPackageJsonMapboxVersion(dir) {
  const pkgPath = path.join(dir, "package.json")
  if (!fs.existsSync(pkgPath)) return null
  try {
    const pkg = JSON.parse(readText(pkgPath))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    return deps["mapbox-gl"] ?? deps["mapbox-gl-draw"] ?? null
  } catch {
    return null
  }
}

function grepMapboxInSources(files) {
  const hits = []
  for (const file of files) {
    if (!/\.(js|jsx|ts|tsx|vue|env|example|md)$/i.test(file)) continue
    const text = readText(file)
    if (!/mapbox/i.test(text)) continue
    if (text.includes("mapboxgl") || text.includes("mapbox-gl") || text.includes("MAPBOX")) {
      hits.push(path.relative(vendorDir, file).replace(/\\/g, "/"))
    }
  }
  return [...new Set(hits)].slice(0, 40)
}

function extractStyleUrls(text) {
  const urls = new Set()
  const patterns = [
    /mapbox:\/\/styles\/[^\s"'`]+/g,
    /https?:\/\/[^\s"'`]*mapbox[^\s"'`]*\/styles\/[^\s"'`]+/gi,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text)) !== null) urls.add(m[0])
  }
  return [...urls]
}

function main() {
  if (!fs.existsSync(vendorDir)) {
    console.error(`Missing ${vendorDir}. Run: npm run setup:manfith`)
    process.exit(1)
  }

  const allFiles = walk(vendorDir)
  const envTexts = []
  for (const name of ENV_FILE_NAMES) {
    for (const f of allFiles) {
      if (path.basename(f) === name || f.endsWith(`/${name}`)) {
        envTexts.push(readText(f))
      }
    }
  }
  // root .env.example
  for (const f of ["", "frontend", "dashboard", "client", "web", "apps/dashboard", "apps/web"]) {
    const p = path.join(vendorDir, f, ".env.example")
    if (fs.existsSync(p)) envTexts.push(readText(p))
  }

  const allEnvKeys = [...new Set(envTexts.flatMap(extractEnvKeys))]
  const mapEnvKeys = filterMapKeys(allEnvKeys)
  const sourceHits = grepMapboxInSources(allFiles)
  const styleUrls = [...new Set(envTexts.flatMap(extractStyleUrls))]

  const mapboxVersion =
    findPackageJsonMapboxVersion(vendorDir) ||
    findPackageJsonMapboxVersion(path.join(vendorDir, "frontend")) ||
    findPackageJsonMapboxVersion(path.join(vendorDir, "dashboard")) ||
    findPackageJsonMapboxVersion(path.join(vendorDir, "client"))

  const tokenCandidates = mapEnvKeys.filter((k) =>
    /(TOKEN|ACCESS|KEY|PUBLIC)/i.test(k)
  )
  const styleCandidates = mapEnvKeys.filter((k) => /STYLE/i.test(k))
  const baseCandidates = mapEnvKeys.filter((k) => /(API|BASE|URL|HOST)/i.test(k))

  const manifest = {
    cloneUrl: "git@github.com:bbccbbcc2010-alt/manfith.git",
    vendorPath: "vendor/manfith",
    discoveredAt: new Date().toISOString(),
    cloned: true,
    mapboxGlVersion: mapboxVersion,
    mapEnvKeys,
    tokenEnvKeys: tokenCandidates,
    styleEnvKeys: styleCandidates,
    apiBaseEnvKeys: baseCandidates,
    styleUrlsFound: styleUrls.slice(0, 10),
    mapSourceFiles: sourceHits,
    oroodEnv: {
      engine: "VITE_MAP_ENGINE=manfith",
      token: "VITE_MANFITH_MAP_PUBLIC_TOKEN",
      style: "VITE_MANFITH_MAP_STYLE_ID",
      apiBase: "VITE_MANFITH_MAP_API_BASE",
      locale: "VITE_MANFITH_LOCALE",
    },
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  console.log(`Wrote ${manifestPath}`)

  const lines = [
    "# Manfith → Orood environment mapping",
    "",
    "Generated from `vendor/manfith`. Copy values from your Manfith deployment into `frontend/.env`.",
    "",
    "```env",
    "VITE_MAP_ENGINE=manfith",
    "```",
    "",
    "| Manfith key (from their repo) | Orood key |",
    "|------------------------------|-----------|",
  ]

  const primaryToken = tokenCandidates[0] ?? "(see Manfith .env.example)"
  lines.push(`| \`${primaryToken}\` | \`VITE_MANFITH_MAP_PUBLIC_TOKEN\` |`)

  if (styleCandidates[0]) {
    lines.push(`| \`${styleCandidates[0]}\` | \`VITE_MANFITH_MAP_STYLE_ID\` |`)
  }
  if (baseCandidates[0]) {
    lines.push(`| \`${baseCandidates[0]}\` | \`VITE_MANFITH_MAP_API_BASE\` |`)
  }

  lines.push("", "## Style URLs found in Manfith repo", "")
  if (styleUrls.length) {
    for (const u of styleUrls) lines.push(`- \`${u}\``)
  } else {
    lines.push("- _(none — use `mapbox/streets-v12` or your Manfith dashboard style)_")
  }

  lines.push("", "## Map-related source files", "")
  if (sourceHits.length) {
    for (const f of sourceHits) lines.push(`- \`${f}\``)
  } else {
    lines.push("- _(none)_")
  }

  if (mapboxVersion) {
    lines.push("", `Manfith \`mapbox-gl\` dependency: **${mapboxVersion}** (Orood uses mapbox-gl ^3.x).`)
  }

  fs.writeFileSync(mappingDocPath, `${lines.join("\n")}\n`, "utf8")
  console.log(`Wrote ${mappingDocPath}`)
  console.log("\nNext: copy token/style from Manfith .env into frontend/.env and restart Vite.")
}

main()
