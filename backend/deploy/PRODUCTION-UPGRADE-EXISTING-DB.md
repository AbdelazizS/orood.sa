# Production upgrade — keep existing database

Use this when **users, listings, branding, and settings already exist**.  
Do **not** run `migrate:fresh` or plain `php artisan db:seed`.

Branch: **`clean-deploy`** · Site: **`https://www.arooth.com`**

---

## What `migrate --force` applies (May 2026 release)

| Migration | Effect on old DB |
|-----------|------------------|
| `2026_05_30_120000` | Adds `products.subcategory_other`, `subcategories.listing_property_type` |
| `2026_05_30_130000` | Re-syncs RE subcategories + listing schemas (idempotent seeders) |
| `2026_05_30_140000` | Sets all schema `min_images` → 0 |
| `2026_05_31_100000` | Nested subcategories: `parent_id`, `sort_order`, slug unique per category |

Existing subcategories stay **root level** (`parent_id = null`). No manual SQL required.

---

## Step 0 — Push code (local machine)

```bash
cd /path/to/orood
git status
git add -A
git commit -m "Production release: nested categories, listing UX, schema fixes"
git push origin clean-deploy
```

---

## Step 1 — Backup (server)

```bash
mkdir -p /root/backups
mysqldump -u arooth -p arooth > /root/backups/arooth_$(date +%F_%H%M).sql
ls -lh /root/backups/arooth_*.sql | tail -1
```

---

## Step 2 — Pull code (server)

```bash
cd /var/www/arooth
git fetch origin
git checkout clean-deploy
git pull origin clean-deploy
```

---

## Step 3 — Backend

```bash
cd /var/www/arooth/backend
composer install --no-dev --optimize-autoloader
```

Confirm `.env` (do not overwrite if already configured):

```env
APP_URL=https://www.arooth.com
FRONTEND_URL=https://www.arooth.com
LISTINGS_AUTO_PUBLISH_ON_CREATE=true
```

Run migrations only:

```bash
php artisan migrate --force
```

Optional (safe on existing DB — finance module toggles):

```bash
php artisan db:seed --class=FinanceModulesSeeder --force
```

Clear and rebuild caches:

```bash
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan seo:generate-sitemap
php artisan frontend:sync-meta
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
systemctl restart php8.2-fpm || systemctl restart php-fpm
```

---

## Step 4 — Frontend

```bash
cd /var/www/arooth/frontend
cp -n .env.production.example .env.production
```

`.env.production` must be:

```env
VITE_USE_DEMO=false
VITE_API_URL=
VITE_SITE_URL=https://www.arooth.com
```

(`VITE_API_URL` empty = same host `/api/v1` — never `localhost`)

```bash
npm ci
npm run build
```

Verify build:

```bash
grep -r "localhost:8000" dist/assets/ && echo "FAIL" || echo "OK"
```

---

## Step 5 — Nginx + queue

```bash
cp /var/www/arooth/backend/deploy/nginx/arooth.conf /etc/nginx/sites-available/arooth
nginx -t && systemctl reload nginx
supervisorctl reread && supervisorctl update && supervisorctl restart arooth-queue:* || true
```

---

## Step 6 — Verify

```bash
bash /var/www/arooth/backend/deploy/verify.sh
cd /var/www/arooth/backend && php artisan test --filter=NestedSubcategoryTest
```

Manual checks:

- [ ] Home feed loads, cards look correct on mobile
- [ ] `/add` — category drill-down, publish without images
- [ ] Admin → Categories — nested subcategory tree
- [ ] Register + login (no `toIso8601String` error)
- [ ] Real estate listing — no duplicate property type field

---

## Do NOT run on existing production

```bash
php artisan migrate:fresh --force          # wipes all data
php artisan db:seed                          # demo data
php artisan db:seed --class=ProductionSeeder # only for empty DB
```

---

## Rollback (if migrate fails)

```bash
mysql -u arooth -p arooth < /root/backups/arooth_YYYY-MM-DD_HHMM.sql
cd /var/www/arooth && git checkout <previous-commit>
# rebuild frontend + cache as above
```

---

## Troubleshooting

**Migration fails on `subcategories` slug unique**  
Duplicate slug under same category — fix duplicates in MySQL then re-run `php artisan migrate --force`.

**«لا يوجد مخطط إعلان منشور» on /add**  
Migration `2026_05_30_130000` should fix this. If not:  
`php artisan db:seed --class=CategoryListingSchemaSeeder --force`  
then `php artisan cache:clear`.

**API / frontend still broken after deploy**  
Rebuild frontend with empty `VITE_API_URL` and hard-refresh browser (Ctrl+Shift+R).
