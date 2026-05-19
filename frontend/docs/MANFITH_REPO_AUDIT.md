# Manfith repository audit

Generated: 2026-05-17T17:46:49.145Z

Source: `frontend/vendor/manfith` (local clone, not committed).

---

## 1. Repository layout

```
manfith/
  .github/
    workflows/
  dashboard/
    public/
    src/
    ... (14 files)
  server/
    controllers/
    db/
    locales/
    middleware/
    models/
    public/
    routes/
    services/
    utils/
    ... (21 files)
  website/
    public/
    src/
    package.json
    ... (9 files)
  package.json
```

**package.json files found:** 4

---

## 2. SDK choice

**pure mapbox-gl** (`new mapboxgl.Map`)

| Package | Where | Version |
|---------|-------|---------|
| `mapbox-gl` | `dashboard\package.json` | ^3.14.0 |

---

## 3. Token flow

### Environment keys (map-related)

- _(none in .env* files — check runtime config or backend)_

### Files referencing tokens

- `dashboard/src/components/MapPicker.vue`
- `dashboard/src/components/MapPreview.vue`
- `dashboard/src/utils/constants.js`

---

## 4. Style flow

### Files / env mentioning style

- `dashboard/src/components/MapPicker.vue`
- `dashboard/src/components/MapPreview.vue`
- `dashboard/src/old_views/dashboard/MainChart.vue`
- `dashboard/src/old_views/widgets/Widgets.vue`
- `dashboard/src/old_views/widgets/WidgetsStatsTypeA.vue`
- `dashboard/src/views/Adminstation/dashboard/MainChart.vue`
- `dashboard/src/views/Vendors/VendorTrucks/TrucksTrakings/TrucksTrakingsPage.vue`
- `dashboard/src/widgets/Widgets.vue`
- `dashboard/src/widgets/WidgetsStatsTypeA.vue`

---

## 5. Init pattern

- No `new mapboxgl.Map(` found — may use **react-map-gl** `<Map>` or dynamic import.

---

## 6. Reusable components?

- No obvious shared map components found in quick scan.

---

## 7. Recommendation for Orood

Match their **mapbox-gl init options** in existing Orood `manfithAdapter.js` (already bundles mapbox-gl ^3.x). Do not import vendor code until license is confirmed.

Keep Orood integration layer:

- [`provider.js`](../src/lib/maps/provider.js) — engine switch
- [`manfithAdapter.js`](../src/lib/maps/manfithAdapter.js) — Mapbox GL load + `createMap`

Next step (STEP 2): isolated `/maps-test` page before touching production pickers.

---

## 8. Risks

| Risk | Notes |
|------|-------|
| **Token referrer restrictions** | Mapbox public tokens must allow Orood domains (localhost + production). |
| **CORS / tile host** | Custom `VITE_MANFITH_MAP_API_BASE` must allow browser origins. |
| **RTL** | Confirm `locale: 'ar'` or Mapbox RTL plugin if used in Manfith. |
| **Version drift** | Orood uses `mapbox-gl` ^3.x; align major version with Manfith lockfile. |
| **Secrets in Git** | Never commit tokens; use `backend/.env` `MAPBOX_PUBLIC_ACCESS_TOKEN` or frontend `.env`. |
| **License** | Confirm Manfith repo license before copying source into Orood vendor alias. |
