# Arooth — full production deploy from zero

Branch: **`clean-deploy`** · Canonical URL: **`https://www.arooth.com`**

---

## Why you saw those errors

| Symptom | Cause |
|--------|--------|
| تعذر الاتصال بالخادم | Frontend built with `VITE_API_URL=http://localhost:8000` — fix `.env.production` and **rebuild** |
| English footer in Arabic | API failed → app used English **fallback** text |
| Logo / branding gone | `migrate:fresh` **wipes DB** — re-upload in **Admin → Branding** after deploy |
| SEO image | Separate from navbar logo — set in **Admin → SEO** + run `frontend:sync-meta` |
| 422 بعد فشل تسجيل (بريد مستخدم) | احذف الصف من `users` لذلك البريد (انظر SQL أدناه) |

### تعطيل التحقق الإجباري من البريد (بدون seeder) — MySQL

الإعداد محفوظ في جدول `app_settings` بالمفتاح `auth.email_verification_required`.  
للسماح بتسجيل الدخول بدون تحقق بريد (قيمة `false`):

```sql
-- عرض القيمة الحالية (اختياري)
SELECT `key`, `value` FROM app_settings WHERE `key` = 'auth.email_verification_required';

INSERT INTO app_settings (`key`, `value`, `created_at`, `updated_at`)
VALUES ('auth.email_verification_required', CAST('false' AS JSON), NOW(), NOW())
ON DUPLICATE KEY UPDATE `value` = CAST('false' AS JSON), `updated_at` = NOW();
```

ثم على السيرفر:

```bash
cd /var/www/arooth/backend && php artisan config:cache
```

### حذف مستخدم عالق بعد تسجيل فاشل

```sql
DELETE FROM users WHERE email = 'البريد@هنا';
```

(احذف فقط إن لم يكن حساباً حقيقياً تريد الإبقاء عليه.)

---

## Before you start

1. DNS: `arooth.com` and `www.arooth.com` → server IP  
2. MySQL database + user ready  
3. Backup if redoing: `mysqldump -u arooth -p arooth > /root/backups/arooth_$(date +%F).sql`

---

## Step 1 — Clone code

```bash
cd /var/www
rm -rf arooth   # only if full redeploy
git clone -b clean-deploy https://github.com/AbdelazizS/orood.sa.git arooth
cd arooth
```

---

## Step 2 — Backend `.env`

```bash
cd /var/www/arooth/backend
cp deploy/env.production.example .env
nano .env
```

Set at minimum:

```env
APP_URL=https://www.arooth.com
FRONTEND_URL=https://www.arooth.com
SEO_SITE_URL=https://www.arooth.com

DB_DATABASE=arooth
DB_USERNAME=arooth
DB_PASSWORD=your_real_password

ADMIN_EMAIL=admin@arooth.com
ADMIN_PASSWORD=your_strong_password
ADMIN_NAME="Platform Admin"
```

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
```

---

## Step 3 — Database (production seed only)

```bash
php artisan migrate:fresh --force
php artisan db:seed --class=ProductionSeeder --force
```

**Never** run plain `php artisan db:seed` on production (loads demo listings).

```bash
php artisan storage:link
php artisan cms:refresh-content
php artisan seo:generate-sitemap
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

---

## Step 4 — Frontend `.env.production` (critical)

```bash
cd /var/www/arooth/frontend
cp .env.production.example .env.production
nano .env.production
```

Must be:

```env
VITE_USE_DEMO=false
VITE_API_URL=
VITE_SITE_URL=https://www.arooth.com
```

`VITE_API_URL` **empty** = requests go to `/api/v1` on same domain (correct for your nginx).

```bash
npm ci
npm run build
```

Verify no localhost in build:

```bash
grep -r "localhost:8000" dist/assets/*.js 2>/dev/null | head -3
# (no output = good)
```

---

## Step 5 — Nginx (www canonical + redirect)

```bash
cp /var/www/arooth/backend/deploy/nginx/arooth.conf /etc/nginx/sites-available/arooth
ln -sf /etc/nginx/sites-available/arooth /etc/nginx/sites-enabled/arooth
rm -f /etc/nginx/sites-enabled/default
```

If SSL not installed yet:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d arooth.com -d www.arooth.com
```

Then ensure config has **301** from `arooth.com` → `www.arooth.com` (see `deploy/nginx/arooth.conf`).

```bash
nginx -t
systemctl reload nginx
```

Test:

```bash
curl -sI https://arooth.com | head -5          # expect 301 → www
curl -sI https://www.arooth.com/api/v1/categories | head -5   # expect 200
```

---

## Step 6 — Queue + cron

```bash
cp /var/www/arooth/backend/deploy/supervisor/arooth-queue.conf /etc/supervisor/conf.d/
supervisorctl reread && supervisorctl update && supervisorctl start arooth-queue:*

crontab -e
# add:
# * * * * * cd /var/www/arooth/backend && php artisan schedule:run >> /var/log/arooth/schedule.log 2>&1
```

---

## Step 7 — Admin setup (browser)

1. Open **https://www.arooth.com** (incognito).  
2. Login: `admin@arooth.com` + password from `.env`.  
3. **Settings → Branding** — upload logo, favicon, footer logos (DB was reset in step 3).  
4. **SEO → Global** — title, description, OG image, site URL `https://www.arooth.com`.  
5. Save.

On server:

```bash
cd /var/www/arooth/backend
php artisan seo:generate-sitemap
php artisan frontend:sync-meta   # if command exists after git pull
php artisan config:cache
```

If `frontend:sync-meta` missing, skip — optional.

---

## Step 8 — Verify

```bash
BASE_URL=https://www.arooth.com bash /var/www/arooth/backend/deploy/verify.sh
```

Browser: homepage loads categories, Arabic footer, logo visible, no network error.

---

## Updates (no full reset)

```bash
cd /var/www/arooth
git pull origin clean-deploy

cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache

cd ../frontend
# confirm .env.production still has VITE_API_URL=
npm ci && npm run build

systemctl reload nginx
```

---

## Checklist

- [ ] `VITE_API_URL=` empty, rebuilt frontend  
- [ ] `APP_URL` / `VITE_SITE_URL` = `https://www.arooth.com`  
- [ ] `arooth.com` → 301 → `www`  
- [ ] `/api/v1/categories` returns 200  
- [ ] Branding re-uploaded after `migrate:fresh`  
- [ ] Search Console: sitemap + request indexing  
