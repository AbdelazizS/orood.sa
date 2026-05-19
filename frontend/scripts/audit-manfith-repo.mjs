#!/usr/bin/env node
/**
 * Deep audit of vendor/manfith → frontend/docs/MANFITH_REPO_AUDIT.md
 * Run after: npm run setup:manfith
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.join(__dirname, "..")
const vendorDir = path.join(frontendRoot, "vendor", "manfith")
const outPath = path.join(frontendRoot, "docs", "MANFITH_REPO_AUDIT.md")

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
])

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

function listPackageJsonFiles(root) {
  return walk(root).filter((f) => path.basename(f) === "package.json")
}

function treeSummary(root, maxDepth = 2) {
  const lines = []
  function go(dir, depth, prefix) {
    if (depth > maxDepth) return
    let names
    try {
      names = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    const dirs = names.filter((n) => n.isDirectory() && !IGNORE_DIRS.has(n.name)).map((n) => n.name)
    const files = names.filter((n) => n.isFile()).map((n) => n.name)
    for (const d of dirs.sort()) {
      lines.push(`${prefix}${d}/`)
      go(path.join(dir, d), depth + 1, `${prefix}  `)
    }
    for (const f of files.sort().slice(0, 8)) {
      if (f === "package.json" || f.startsWith(".env")) lines.push(`${prefix}${f}`)
    }
    if (files.length > 8) lines.push(`${prefix}... (${files.length} files)`)
  }
  lines.push(`${path.basename(root)}/`)
  go(root, 1, "  ")
  return lines.join("\n")
}

function findDeps(pkgs) {
  const hits = {}
  const watch = ["mapbox-gl", "react-map-gl", "@mapbox/mapbox-gl-draw", "maplibre-gl"]
  for (const pkgPath of pkgs) {
    try {
      const pkg = JSON.parse(readText(pkgPath))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      for (const name of watch) {
        if (deps[name]) {
          if (!hits[name]) hits[name] = []
          hits[name].push({ path: path.relative(vendorDir, pkgPath), version: deps[name] })
        }
      }
    } catch {
      /* ignore */
    }
  }
  return hits
}

function grepPatterns(files, patterns) {
  const results = []
  for (const file of files) {
    if (!/\.(js|jsx|ts|tsx|vue|mjs|cjs|env|example|sample|template|md)$/i.test(file)) continue
    const text = readText(file)
    for (const { label, re } of patterns) {
      if (re.test(text)) {
        results.push({ label, file: path.relative(vendorDir, file).replace(/\\/g, "/") })
        re.lastIndex = 0
      }
    }
  }
  return results
}

function extractSnippets(files, re, max = 3) {
  const out = []
  for (const file of files) {
    if (!/\.(js|jsx|ts|tsx|vue)$/i.test(file)) continue
    const text = readText(file)
    const idx = text.search(re)
    if (idx === -1) continue
    const start = Math.max(0, idx - 120)
    const end = Math.min(text.length, idx + 280)
    out.push({
      file: path.relative(vendorDir, file).replace(/\\/g, "/"),
      snippet: text.slice(start, end).replace(/\r\n/g, "\n"),
    })
    if (out.length >= max) return out
  }
  return out
}

function main() {
  if (!fs.existsSync(path.join(vendorDir, ".git"))) {
    console.error(`Missing git checkout: ${vendorDir}`)
    console.error("Run: npm run setup:manfith")
    process.exit(1)
  }

  const allFiles = walk(vendorDir)
  const pkgFiles = listPackageJsonFiles(vendorDir)
  const deps = findDeps(pkgFiles)

  const tokenHits = grepPatterns(allFiles, [
    { label: "accessToken", re: /accessToken|access_token|MAPBOX.*TOKEN|VITE_.*MAP|NEXT_PUBLIC_.*MAP/i },
  ])
  const styleHits = grepPatterns(allFiles, [
    { label: "style", re: /mapbox:\/\/styles|MAP.*STYLE|styleId|getStyle/i },
  ])
  const initSnippets = extractSnippets(allFiles, /new\s+mapboxgl\.Map\s*\(/)

  const componentHits = grepPatterns(allFiles, [
    {
      label: "map-components",
      re: /MapProvider|MapView|LocationPicker|useMap\(|react-map-gl/,
    },
  ])

  const envKeys = new Set()
  for (const f of allFiles) {
    const base = path.basename(f)
    if (!/^\.env|\.env\.|env\.example$/i.test(base) && !base.includes(".env.")) continue
    const text = readText(f)
    let m
    const re = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm
    while ((m = re.exec(text)) !== null) {
      if (/MAP|MAPBOX|MANFITH|STYLE|TILE|GEO/i.test(m[1])) envKeys.add(m[1])
    }
  }

  let sdkChoice = "**Unknown**"
  if (deps["react-map-gl"]?.length) sdkChoice = "**react-map-gl** (React wrapper over Mapbox)"
  else if (deps["mapbox-gl"]?.length) sdkChoice = "**pure mapbox-gl** (`new mapboxgl.Map`)"
  if (deps["maplibre-gl"]?.length) sdkChoice += " + maplibre-gl present"

  const hasMapboxGl = Boolean(deps["mapbox-gl"]?.length)
  const hasReactMapGl = Boolean(deps["react-map-gl"]?.length)
  const recommendation = hasReactMapGl
    ? "Prefer reusing **init/style/token env names** in Orood `manfithAdapter.js`; optional thin wrapper components only if license allows importing their package path."
    : hasMapboxGl
      ? "Match their **mapbox-gl init options** in existing Orood `manfithAdapter.js` (already bundles mapbox-gl ^3.x). Do not import vendor code until license is confirmed."
      : "Inspect repo further; may use custom tile host only."

  const lines = [
    "# Manfith repository audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Source: `frontend/vendor/manfith` (local clone, not committed).",
    "",
    "---",
    "",
    "## 1. Repository layout",
    "",
    "```",
    treeSummary(vendorDir),
    "```",
    "",
    `**package.json files found:** ${pkgFiles.length}`,
    "",
    "---",
    "",
    "## 2. SDK choice",
    "",
    sdkChoice,
    "",
    "| Package | Where | Version |",
    "|---------|-------|---------|",
  ]

  for (const [name, entries] of Object.entries(deps)) {
    for (const e of entries) {
      lines.push(`| \`${name}\` | \`${e.path}\` | ${e.version} |`)
    }
  }
  if (!Object.keys(deps).length) lines.push("| _(none of mapbox-gl / react-map-gl found)_ | | |")

  lines.push(
    "",
    "---",
    "",
    "## 3. Token flow",
    "",
    "### Environment keys (map-related)",
    ""
  )
  if (envKeys.size) {
    for (const k of [...envKeys].sort()) lines.push(`- \`${k}\``)
  } else {
    lines.push("- _(none in .env* files — check runtime config or backend)_")
  }

  lines.push("", "### Files referencing tokens", "")
  const tokenFiles = [...new Set(tokenHits.map((h) => h.file))].slice(0, 25)
  if (tokenFiles.length) {
    for (const f of tokenFiles) lines.push(`- \`${f}\``)
  } else {
    lines.push("- _(no matches)_")
  }

  lines.push(
    "",
    "---",
    "",
    "## 4. Style flow",
    "",
    "### Files / env mentioning style",
    ""
  )
  const styleFiles = [...new Set(styleHits.map((h) => h.file))].slice(0, 25)
  if (styleFiles.length) {
    for (const f of styleFiles) lines.push(`- \`${f}\``)
  } else {
    lines.push("- _(no matches — style may be built at runtime)_")
  }

  lines.push("", "---", "", "## 5. Init pattern", "")
  if (initSnippets.length) {
    for (const { file, snippet } of initSnippets) {
      lines.push(`### \`${file}\``, "", "```javascript", snippet.trim(), "```", "")
    }
  } else {
    lines.push(
      "- No `new mapboxgl.Map(` found — may use **react-map-gl** `<Map>` or dynamic import.",
      ""
    )
  }

  lines.push("---", "", "## 6. Reusable components?", "")
  const compFiles = [...new Set(componentHits.map((h) => h.file))].slice(0, 30)
  if (compFiles.length) {
    lines.push("**Likely map-related modules:**", "")
    for (const f of compFiles) lines.push(`- \`${f}\``)
    lines.push(
      "",
      "**For Orood:** treat as reference; import only if license + package exports allow. Otherwise copy init/style/token mapping only."
    )
  } else {
    lines.push("- No obvious shared map components found in quick scan.")
  }

  lines.push(
    "",
    "---",
    "",
    "## 7. Recommendation for Orood",
    "",
    recommendation,
    "",
    "Keep Orood integration layer:",
    "",
    "- [`provider.js`](../src/lib/maps/provider.js) — engine switch",
    "- [`manfithAdapter.js`](../src/lib/maps/manfithAdapter.js) — Mapbox GL load + `createMap`",
    "",
    "Next step (STEP 2): isolated `/maps-test` page before touching production pickers.",
    "",
    "---",
    "",
    "## 8. Risks",
    "",
    "| Risk | Notes |",
    "|------|-------|",
    "| **Token referrer restrictions** | Mapbox public tokens must allow Orood domains (localhost + production). |",
    "| **CORS / tile host** | Custom `VITE_MANFITH_MAP_API_BASE` must allow browser origins. |",
    "| **RTL** | Confirm `locale: 'ar'` or Mapbox RTL plugin if used in Manfith. |",
    "| **Version drift** | Orood uses `mapbox-gl` ^3.x; align major version with Manfith lockfile. |",
    "| **Secrets in Git** | Never commit tokens; use `backend/.env` `MAPBOX_PUBLIC_ACCESS_TOKEN` or frontend `.env`. |",
    "| **License** | Confirm Manfith repo license before copying source into Orood vendor alias. |",
    ""
  )

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, lines.join("\n"), "utf8")
  console.log(`Wrote ${outPath}`)
}

main()
