#!/usr/bin/env bash
# Quick post-deploy checks (run on server).
set -euo pipefail

BASE="${BASE_URL:-http://arooth.com}"

check() {
  local path="$1"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}${path}" || echo "000")
  echo "${code}  ${path}"
}

echo "==> HTTP checks (${BASE})"
check "/"
check "/up"
check "/api/v1/categories"
check "/robots.txt"
check "/sitemap_index.xml"

echo ""
echo "==> robots.txt (first lines)"
curl -sS "${BASE}/robots.txt" | head -5

echo ""
echo "==> API sample"
curl -sS "${BASE}/api/v1/categories" | head -c 300
echo ""
