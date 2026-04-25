# Maps setup: Google Cloud and OpenStreetMap (OSM)

This project’s **view-at-location** flow uses a map for the buyer’s meeting point. You can use **Google Maps** (rich address autocomplete + geocoding) or **Leaflet + OpenStreetMap** (no Google API key, different tradeoffs).

---

## Choosing a provider (`VITE_MAP_PROVIDER`)

| Value | Behavior |
|--------|----------|
| *(unset)* | **Google** if `VITE_GOOGLE_MAPS_API_KEY` is set; otherwise **OSM** (Leaflet). |
| `google` | **Google** when a key exists; otherwise falls back to **OSM**. |
| `osm` | Always **OSM**, even if a Google key is present. |

Set in `frontend/.env` (not committed):

```env
# Optional: google | osm
VITE_MAP_PROVIDER=osm
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

---

## Google Maps Platform — is it “free”?

**Not unlimited free.** Google requires a **billing account** on the Cloud project. In practice:

- Google publishes a **monthly Maps Platform credit** (often cited around **USD 200/month** toward eligible SKUs). **Verify the current amount** on the official pricing page: [Maps Platform pricing](https://mapsplatform.google.com/pricing/).
- **Low traffic** (personal dev, small staging, modest production) often stays **within the monthly credit**.
- **High traffic** (many map loads, heavy Places Autocomplete usage per keystroke, large-scale geocoding) can **exceed** the credit → you pay **overage** per SKU.

**Recommendations**

1. Enable **budget alerts** in Google Cloud Billing.
2. Set **daily quotas** on the APIs you use (Maps JavaScript API, Places API, Geocoding API).
3. **Restrict API keys** (HTTP referrers for web apps; never ship unrestricted keys to production).

### Budget alerts and quotas (step-by-step)

1. In Google Cloud Console open **Billing → Budgets & alerts → Create budget**.
2. Set scope to your project (or billing account), choose amount, and add email alerts at **50% / 80% / 100%**.
3. Open **APIs & Services → Enabled APIs →** select each Maps-related API → **Quotas** (or **Quotas & system limits**) and set sensible **per-day** caps for map loads, Places Autocomplete, and Geocode calls.
4. After launch, review **APIs & Services → Dashboard** weekly; adjust quotas before increasing spend.

### Runtime behavior in this app

- If `VITE_GOOGLE_MAPS_API_KEY` is set and `VITE_MAP_PROVIDER` is not `osm`, the UI tries **Google** first.
- If the Google script fails to load (key, billing, referrer restriction, network), the **view-at-location** picker **falls back to OpenStreetMap (Leaflet)** and shows a short notice (AR/EN).
- In development, the browser console may log `[maps] provider …` to show which stack is active (not sent to any server).

### Rollout checklist (staging → production)

1. Create a **separate** browser API key for production with **production domain** referrers only.
2. Deploy to staging; confirm map, autocomplete (Google), pin drag, reverse address, and submit view request.
3. Temporarily **break** the staging key (wrong referrer) and confirm **OSM fallback** still allows submitting with pin + manual address.
4. Enable billing alerts and quotas; monitor for 3–7 days; then promote to production.

This document is **not legal or financial advice**; confirm terms with Google and your organization.

---

## Google setup (from zero)

### 1) Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **new project** (or pick an existing one).
3. Link a **billing account** to the project (required for Maps Platform, even when usage stays within free credit).

### 2) Enable APIs

In **APIs & Services → Library**, enable at least:

- **Maps JavaScript API** — loads the interactive map.
- **Places API** — address autocomplete on the location field (when using Google mode).
- **Geocoding API** — reverse geocoding from pin coordinates to a readable address (optional but used by the app when the pin moves).

### 3) Create an API key

1. **APIs & Services → Credentials → Create credentials → API key**.
2. **Restrict the key**:
   - **Application restrictions**: HTTP referrers (web sites).
   - Add your origins, for example:
     - `http://localhost:5173/*` (Vite dev)
     - `https://your-production-domain/*`
3. **API restrictions**: restrict the key to only the APIs above (least privilege).

### 4) Configure the frontend

In `frontend/.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_KEY
# Optional default map center (Saudi Arabia)
# VITE_MAP_DEFAULT_LAT=24.7136
# VITE_MAP_DEFAULT_LNG=46.6753
```

Restart `npm run dev` after changes.

### 5) Useful links

- [Maps JavaScript API overview](https://developers.google.com/maps/documentation/javascript)
- [Places Autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [API key best practices](https://developers.google.com/maps/api-security-best-practices)

---

## OSM / Leaflet mode (no Google key)

When the app runs in **OSM** mode:

- **Tiles**: OpenStreetMap contributors ([copyright / license](https://www.openstreetmap.org/copyright)).
- **Reverse geocoding**: [Nominatim](https://nominatim.org/) (OpenStreetMap Foundation usage policy applies). The app sends a modest debounced rate and identifies itself in the `User-Agent`. **Do not** use this for high-volume or offline bulk geocoding without your own Nominatim instance or another provider.
- **Address field**: there is **no Google Places** autocomplete; users type the address manually and/or rely on reverse geocode after placing the pin.

**Cost**: no Google Maps bill for this path; respect OSM tile and Nominatim **fair use** policies.

---

## إعداد الخرائط (Google) — دليل مختصر بالعربية

### هل الخدمة مجانية بالكامل؟

**لا يوجد استخدام غير محدود مجانًا بالمعنى التجاري.** Google يتطلب **تفعيل الفوترة** على المشروع. عادة يتوفر **رصيد شهري** لمنصة الخرائط (راجع الموقع الرسمي للأسعار والرصيد الحالي). التطبيقات ذات الحركة المنخفضة غالبًا تبقى ضمن الرصيد؛ التطبيقات الكبيرة جدًا قد تتجاوزه وتدفع **تكاليف إضافية**.

### الخطوات باختصار

1. أنشئ مشروعًا في [Google Cloud Console](https://console.cloud.google.com/) واربط **فوترة**.
2. فعّل الواجهات: **Maps JavaScript API**، **Places API**، ويفضل **Geocoding API** (للعكس من الإحداثيات إلى عنوان).
3. أنشئ **مفتاح API** وقيّده بـ **HTTP referrers** (مثل `http://localhost:5173/*` والنطاق الإنتاجي).
4. ضع المفتاح في `frontend/.env`:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=مفتاحك
   ```
5. راقب الاستهلاك من **Billing → Budgets** وحدد **حدود يومية** للواجهات.

### وضع OpenStreetMap (`VITE_MAP_PROVIDER=osm`)

بدون مفتاح Google: الخريطة تعمل بـ **Leaflet + OSM**؛ العنوان يُكتب يدويًا؛ الإحداثيات من الدبوس؛ **لا فوترة Google** مع الالتزام بسياسات استخدام OSM وNominatim.

---

## Dev tip: Vite “504 Outdated Optimize Dep”

If the browser shows **504 Outdated Optimize Dep** for a file under `node_modules/.vite/deps/`, stop the dev server, delete the folder `frontend/node_modules/.vite`, run `npm run dev` again, and hard-refresh. Use `npm run dev:clean` or `npm run dev:force` if defined in `package.json`.
