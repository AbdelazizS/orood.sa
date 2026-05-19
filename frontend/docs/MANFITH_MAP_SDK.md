# Manfith / Mapbox map engine

Orood can use **Mapbox GL JS** (same stack as Manfith dashboard `mapboxgl-canvas`) when:

```env
VITE_MAP_ENGINE=manfith
VITE_MANFITH_MAP_PUBLIC_TOKEN=pk.eyJ...
```

Optional:

| Variable | Purpose |
|----------|---------|
| `VITE_MANFITH_MAP_STYLE_ID` | Mapbox style (`mapbox/streets-v12`) or full `mapbox://` / HTTPS URL |
| `VITE_MANFITH_MAP_API_BASE` | Custom tile/style host prefix |
| `VITE_MANFITH_LOCALE` | `ar` or `en` (else follows app i18n) |
| `VITE_MAPBOX_ACCESS_TOKEN` | Alias for the public token |

## Vendoring Manfith GitHub SDK

Clone the private Manfith repo locally (not committed to Git):

```bash
cd frontend
npm run setup:manfith    # clones vendor/manfith, runs discover
npm run discover:manfith  # re-scan after manual edits
```

Default remote: `git@github.com:bbccbbcc2010-alt/manfith.git`

HTTPS (if SSH is unavailable):

```bash
MANFITH_REPO_URL=https://github.com/bbccbbcc2010-alt/manfith.git npm run setup:manfith
```

Outputs:

- [`src/lib/maps/manfith-sdk.manifest.json`](../src/lib/maps/manfith-sdk.manifest.json) — discovered tokens/styles
- [`docs/MANFITH_ENV_MAPPING.md`](MANFITH_ENV_MAPPING.md) — copy keys into `frontend/.env`

Orood still bundles **mapbox-gl** in `manfithAdapter.js` until Manfith exports a package you can import via Vite alias from `vendor/manfith/`.

## Geocoding

With `VITE_MAP_ENGINE=manfith` and a valid token:

- **Reverse** (pin → address): Mapbox Geocoding API
- **Forward** (address field): press **Enter** after typing (Mapbox forward geocode, country bias `sa`)

Legacy engine keeps Google Places (when configured) or Nominatim (OSM).

## Components

| Component | Role |
|-----------|------|
| `UserLocationPicker` | Pickers (checkout, profile, listings) |
| `MapEmbed` / `LazyMapEmbed` | Read-only maps (property, `/map`, previews) |
| `manfithAdapter.js` | `loadManfithMapSdk`, `createMap` |

## Fallback

If token is missing or Mapbox fails to load → **OpenStreetMap (Leaflet)** automatically (same as Google failure today).

## Billing

Mapbox charges per map load and geocoding request. Restrict tokens by URL referrer in the Mapbox dashboard.
