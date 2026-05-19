#!/usr/bin/env bash
# Orood production setup on Ubuntu (run as root after git clone).
# Usage:
#   export GIT_BRANCH=clean-deploy
#   export REPO_URL=https://github.com/AbdelazizS/orood.sa.git
#   bash /var/www/arooth/backend/deploy/server-setup.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/AbdelazizS/orood.sa.git}"
GIT_BRANCH="${GIT_BRANCH:-clean-deploy}"
APP_ROOT="${APP_ROOT:-/var/www/arooth}"
SKIP_CLONE="${SKIP_CLONE:-0}"

echo "==> Orood deploy (branch: ${GIT_BRANCH})"

if [[ "${SKIP_CLONE}" != "1" ]]; then
  echo "==> Clone repository"
  rm -rf "${APP_ROOT}"
  mkdir -p "$(dirname "${APP_ROOT}")"
  git clone -b "${GIT_BRANCH}" "${REPO_URL}" "${APP_ROOT}"
fi

cd "${APP_ROOT}/backend"

echo "==> Composer"
composer install --no-dev --optimize-autoloader

if [[ ! -f .env ]]; then
  echo "==> Create .env from deploy/env.production.example"
  cp deploy/env.production.example .env
  php artisan key:generate --force
  echo "!! Edit ${APP_ROOT}/backend/.env (DB, ADMIN_EMAIL, ADMIN_PASSWORD) then re-run from migrate step."
fi

echo "==> Migrate + production seed (NO demo data)"
php artisan migrate:fresh --force
php artisan db:seed --class=ProductionSeeder --force

echo "==> CMS + SEO"
php artisan cms:refresh-content || true
php artisan seo:generate-sitemap || true

echo "==> Optimize + permissions"
php artisan storage:link || true
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
mkdir -p /var/log/arooth
chown -R www-data:www-data "${APP_ROOT}/backend/storage" "${APP_ROOT}/backend/bootstrap/cache"
chmod -R 775 "${APP_ROOT}/backend/storage" "${APP_ROOT}/backend/bootstrap/cache"

echo "==> Frontend build"
cd "${APP_ROOT}/frontend"
if [[ ! -f .env.production ]]; then
  cp .env.production.example .env.production
  echo "!! Edit ${APP_ROOT}/frontend/.env.production if needed"
fi
npm ci
npm run build

echo "==> Nginx"
cp "${APP_ROOT}/backend/deploy/nginx/arooth.conf" /etc/nginx/sites-available/arooth
ln -sf /etc/nginx/sites-available/arooth /etc/nginx/sites-enabled/arooth
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl restart php8.2-fpm || systemctl restart php-fpm || true

echo "==> Supervisor queue (optional)"
if command -v supervisorctl >/dev/null 2>&1; then
  cp "${APP_ROOT}/backend/deploy/supervisor/arooth-queue.conf" /etc/supervisor/conf.d/arooth-queue.conf
  supervisorctl reread
  supervisorctl update
  supervisorctl start arooth-queue:* || true
fi

echo "==> Done. Install cron from deploy/cron/arooth-schedule"
echo "    Run: bash ${APP_ROOT}/backend/deploy/verify.sh"
