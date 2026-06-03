# Orood production deploy (arooth.com)

Branch: **`clean-deploy`** · Canonical: **`https://www.arooth.com`**

**Full step-by-step (from zero):** see **[DEPLOY-FROM-ZERO.md](./DEPLOY-FROM-ZERO.md)**

**Upgrade existing DB (keep users & listings):** see **[PRODUCTION-UPGRADE-EXISTING-DB.md](./PRODUCTION-UPGRADE-EXISTING-DB.md)**

## Before you start

1. Backup MySQL: `mysqldump -u arooth -p arooth > /root/backups/arooth_$(date +%F).sql`
2. DNS A records: `@` and `www` → server IP

## Quick setup (server)

```bash
export GIT_BRANCH=clean-deploy
bash /var/www/arooth/backend/deploy/server-setup.sh
```

Or step by step:

```bash
git clone -b clean-deploy https://github.com/AbdelazizS/orood.sa.git /var/www/arooth
cd /var/www/arooth/backend
cp deploy/env.production.example .env
nano .env   # DB, ADMIN_EMAIL (@arooth.com), ADMIN_PASSWORD
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate:fresh --force
php artisan db:seed --class=ProductionSeeder --force
php artisan cms:refresh-content
php artisan frontend:sync-meta   # after admin SEO/branding uploads — patches index.html OG + favicon for crawlers
php artisan seo:generate-sitemap
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

```bash
cd /var/www/arooth/frontend
cp .env.production.example .env.production
npm ci && npm run build
cd /var/www/arooth/backend && php artisan frontend:sync-meta
```


```bash
cp /var/www/arooth/backend/deploy/nginx/arooth.conf /etc/nginx/sites-available/arooth
ln -sf /etc/nginx/sites-available/arooth /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Auth: disable mandatory email verification (MySQL, no seeder)

If login is blocked until email is verified, set the flag in `app_settings`:

```sql
INSERT INTO app_settings (`key`, `value`, `created_at`, `updated_at`)
VALUES ('auth.email_verification_required', CAST('false' AS JSON), NOW(), NOW())
ON DUPLICATE KEY UPDATE `value` = CAST('false' AS JSON), `updated_at` = NOW();
```

Then: `php artisan config:cache`

## Important: do NOT use default seeder on production

```bash
# WRONG — loads demo users and fake listings
php artisan db:seed

# CORRECT
php artisan db:seed --class=ProductionSeeder --force
```

## Queue + cron

- Supervisor: `deploy/supervisor/arooth-queue.conf`
- Cron: `deploy/cron/arooth-schedule` → `* * * * * php artisan schedule:run`

## SSL

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d arooth.com -d www.arooth.com
```

Then set `https://` in `backend/.env` and `frontend/.env.production` and run `npm run build` again.

## Verify

```bash
bash /var/www/arooth/backend/deploy/verify.sh
```
