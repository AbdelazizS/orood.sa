# Maps setup: Manfith/Mapbox, Google, and OpenStreetMap (OSM)

Orood supports three stacks:

| `VITE_MAP_ENGINE` | Stack | Best for |
|-------------------|--------|----------|
| `manfith` | **Mapbox GL JS** (Manfith-style tokens) | Match [Manfith](https://www.manfith.com) dashboard (`mapboxgl-canvas`) |
| *(unset)* + Google key | **Google Maps** + Places | Rich autocomplete |
| *(unset)* no Google key | **Leaflet + OSM** | No paid API key |

See **[MANFITH_MAP_SDK.md](./MANFITH_MAP_SDK.md)** for Mapbox token and style setup.

Clone the Manfith reference repo locally (requires GitHub access): `npm run setup:manfith` — then copy env keys from `docs/MANFITH_ENV_MAPPING.md`.

```env
VITE_MAP_ENGINE=manfith
VITE_MANFITH_MAP_PUBLIC_TOKEN=pk.eyJ...
# optional: VITE_MANFITH_MAP_STYLE_ID=mapbox/streets-v12
```

When Mapbox fails or token is missing, pickers and embeds **fall back to OSM** automatically.

### Verify setup

```powershell
cd frontend
npm run maps:verify
npm run dev
```

- Dev smoke test: `http://localhost:5173/maps-test` (DEV only; hidden in production build)
- Companies browse map: `http://localhost:5173/map`
- Order delivery map: dashboard order detail when `shipping_lat` / `shipping_lng` exist

### Mapbox address search (Manfith engine)

`MapboxLocationMapPicker` includes a debounced `MapSearchBar` (300ms) plus **Enter** on linked address fields. Document for QA in AR/EN.

### Enterprise map modules (MVP)

| Layer | Path |
|-------|------|
| Facade | `src/lib/maps/manfithAdapter.js` |
| Token / style | `src/lib/maps/token.js` |
| Core | `src/lib/maps/core/` (instance, camera, rtl, mapTheme, controls, sdk) |
| Layers | `src/lib/maps/layers/` (markers, cluster, route) |
| UI shell | `src/components/maps/shell/` (MapShell, MapChrome, MapSearchBar) |
| Cluster browse | `/map` + `MapboxClusterEmbed` when Mapbox active |
| Delivery route | `DeliveryTrackingMap` + hub → destination line |

Dark mode uses `mapbox://styles/mapbox/dark-v11` when no custom `VITE_MANFITH_MAP_STYLE_ID`. RTL text plugin loads automatically for Arabic.

Run `npm run build` before release; restart `npm run dev` after any `.env` change.

### Enterprise map checklist (production)

Use this when reviewing maps before go-live (Airbnb/Uber/Zillow-style expectations):

| Area | Requirement |
|------|-------------|
| **Legal** | Mapbox/Google attribution visible somewhere (site footer is OK if hidden on individual embeds). Privacy policy covers location storage (PDPL/GDPR). |
| **Keys** | Separate dev/staging/prod keys; HTTP referrer restrictions; billing alerts and daily quotas. |
| **UX** | One primary map per screen; read-only preview on browse, picker on edit; search + pin + address field in sync; RTL/locale on geocoding. |
| **Performance** | Lazy-load SDK; avoid destroying the map on unrelated React re-renders; `resize()` when tabs/modals open; debounced reverse geocode with abort. |
| **Data** | Store `lat`, `lng`, `location_address`, and canonical `city_id`; validate coords server-side; sync company city when user city changes. |
| **A11y** | Text address line on profile (not map-only); labeled map controls; keyboard-focusable chrome. |
| **Ops** | Monitor geocode failures and API quota; OSM fallback when Mapbox token fails. |

Profile edit: picking on the map auto-fills address and city (when city dropdown is empty) via `mapboxReverseGeocodeDetailed` / `resolveCityIdFromName`.

### Empty map (no pin saved yet)

When `location_lat` / `location_lng` are empty, the **edit picker** should still show:

- Real basemap tiles (OSM or Mapbox), centered on the Saudi default (Riyadh: `24.7136`, `46.6753` from `VITE_MAP_DEFAULT_LAT/LNG` or API `default_center`).
- Zoom **~6** (KSA country overview on land), **no marker** until the user clicks or searches. After a pin is saved, pickers fly to street zoom (~13–14).
- A short hint overlay: “Tap the map to set your location” (tiles stay visible underneath).

**Solid blue with no streets is not the empty state** — it means Mapbox GL loaded but **tiles failed** (bad token, referrer block, or timeout). Fix: use `VITE_MAP_PROVIDER=osm` in dev, or set a valid Mapbox public token. The app falls back to OSM within ~5s when Mapbox errors.

**Profile maps** (`ProfileEditForm`, public profile `الموقع`) always use OSM/Leaflet via `forceLegacy`, regardless of backend Mapbox token.

**Public profile:** the **الموقع** block appears only after coordinates are saved; until then owners see a text hint (by design).

---

## Choosing a provider (`VITE_MAP_PROVIDER`)

| Value | Behavior |
|--------|----------|
| *(unset)* | **Google** if `VITE_GOOGLE_MAPS_API_KEY` is set; otherwise **OSM** (Leaflet). |
| `google` | **Google** when a key exists; otherwise falls back to **OSM**. |
| `osm` | **Leaflet/OSM for all maps**, even if `GET /api/v1/maps/config` returns a Mapbox token. Use this in local dev when the backend token is missing or invalid (avoids a blue Mapbox canvas). |

To use Mapbox despite `VITE_MAP_PROVIDER=osm`, set `VITE_MAP_ENGINE=manfith` and a valid `VITE_MANFITH_MAP_PUBLIC_TOKEN` (or fix `MAPBOX_PUBLIC_ACCESS_TOKEN` on the API).

When Mapbox is tried but tiles fail (401, bad style, timeout), pickers and embeds **fall back to OSM** automatically.

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
- **Geocoding (search + reverse)**: proxied through Laravel (`GET /api/v1/maps/geocode/search` and `/reverse`) with a proper `User-Agent`, caching, and rate limits. The browser **never** calls Nominatim directly.
- **Address search**: `MapSearchBar` uses Mapbox when a public token is configured; otherwise the backend Nominatim proxy. Configure `NOMINATIM_USER_AGENT` in backend `.env` for production.
- **Do not** use the public Nominatim instance for high-volume bulk geocoding without your own Nominatim server or another provider.

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
