#!/usr/bin/env node
/**
 * Clone or update git@github.com:bbccbbcc2010-alt/manfith.git into frontend/vendor/manfith
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const vendorRoot = path.join(__dirname, "..", "vendor")
const vendorDir = path.join(vendorRoot, "manfith")
const externalPath = process.env.MANFITH_REPO_PATH?.trim()

function resolveRepoUrl() {
  if (process.env.MANFITH_REPO_URL?.trim()) return process.env.MANFITH_REPO_URL.trim()
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim()
  if (token) {
    return `https://x-access-token:${token}@github.com/bbccbbcc2010-alt/manfith.git`
  }
  return "git@github.com:bbccbbcc2010-alt/manfith.git"
}

const repoUrl = resolveRepoUrl()

fs.mkdirSync(vendorRoot, { recursive: true })

if (externalPath && fs.existsSync(path.join(externalPath, ".git"))) {
  console.log(`Using existing clone: ${externalPath}`)
  if (fs.existsSync(vendorDir)) {
    const stat = fs.lstatSync(vendorDir)
    if (stat.isSymbolicLink()) fs.unlinkSync(vendorDir)
    else if (!fs.existsSync(path.join(vendorDir, ".git"))) {
      fs.rmSync(vendorDir, { recursive: true, force: true })
    }
  }
  if (!fs.existsSync(vendorDir)) {
    fs.symlinkSync(path.resolve(externalPath), vendorDir, "junction")
  }
  console.log("Running discover:manfith...")
  execSync("node scripts/discover-manfith-sdk.mjs", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  })
  execSync("node scripts/audit-manfith-repo.mjs", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  })
  process.exit(0)
}

if (fs.existsSync(path.join(vendorDir, ".git"))) {
  console.log(`Updating ${vendorDir}...`)
  execSync("git pull --ff-only", { cwd: vendorDir, stdio: "inherit" })
} else if (fs.existsSync(vendorDir) && fs.readdirSync(vendorDir).length > 0) {
  console.error(`Directory exists but is not a git repo: ${vendorDir}`)
  process.exit(1)
} else {
  const ghPaths = [
    process.env.GH_PATH,
    "gh",
    path.join(process.env.ProgramFiles ?? "", "GitHub CLI", "gh.exe"),
    path.join(process.env.LocalAppData ?? "", "Programs", "GitHub CLI", "gh.exe"),
  ].filter(Boolean)

  let clonedViaGh = false
  for (const ghBin of ghPaths) {
    try {
      execSync(`"${ghBin}" auth status`, { stdio: "ignore" })
      console.log(`Cloning via GitHub CLI (${ghBin})...`)
      fs.mkdirSync(path.dirname(vendorDir), { recursive: true })
      execSync(`"${ghBin}" repo clone bbccbbcc2010-alt/manfith "${vendorDir}" -- --depth 1`, {
        stdio: "inherit",
      })
      clonedViaGh = true
      break
    } catch {
      /* try next */
    }
  }

  if (!clonedViaGh) {
  console.log(`Cloning ${repoUrl} -> ${vendorDir}`)
  try {
    execSync(`git clone --depth 1 "${repoUrl}" "${vendorDir}"`, { stdio: "inherit" })
  } catch (err) {
    console.error("\nClone failed. Common fixes:")
    console.error("  • SSH: add github.com to known_hosts, ensure your key has repo access")
    console.error("  • HTTPS: MANFITH_REPO_URL=https://github.com/bbccbbcc2010-alt/manfith.git npm run setup:manfith")
    console.error("  • Token: GITHUB_TOKEN=<pat> npm run setup:manfith")
    console.error("  • Existing clone: MANFITH_REPO_PATH=C:\\path\\to\\manfith npm run setup:manfith")
    console.error("  • See frontend/vendor/README.md\n")
    process.exit(err.status ?? 1)
  }
  }
}

console.log("Running discover:manfith...")
execSync("node scripts/discover-manfith-sdk.mjs", {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
})
console.log("Running audit:manfith...")
execSync("node scripts/audit-manfith-repo.mjs", {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
})
