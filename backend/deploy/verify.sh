#!/usr/bin/env bash
# Quick post-deploy checks (run on server).
set -euo pipefail

BASE="${BASE_URL:-https://www.arooth.com}"

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
check "/api/v1/branding"
check "/robots.txt"
check "/sitemap_index.xml"

echo ""
echo "==> Redirect bare domain → www"
curl -sI https://arooth.com 2>/dev/null | head -5 || true

echo ""
echo "==> robots.txt (first lines)"
curl -sS "${BASE}/robots.txt" | head -5

echo ""
echo "==> API sample"
curl -sS "${BASE}/api/v1/categories" | head -c 300
echo ""

echo ""
echo "==> Built frontend must NOT call localhost"
if grep -rq "localhost:8000" /var/www/arooth/frontend/dist/assets/ 2>/dev/null; then
  echo "FAIL: dist still contains localhost:8000 — fix frontend/.env.production and npm run build"
  exit 1
fi
echo "OK: no localhost:8000 in dist"
