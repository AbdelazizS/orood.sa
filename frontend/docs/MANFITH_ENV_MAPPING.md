# Manfith → Orood environment mapping

Generated from `vendor/manfith`. Copy values from your Manfith deployment into `frontend/.env`.

```env
VITE_MAP_ENGINE=manfith
```

| Manfith key (from their repo) | Orood key |
|------------------------------|-----------|
| `(see Manfith .env.example)` | `VITE_MANFITH_MAP_PUBLIC_TOKEN` |

## Style URLs found in Manfith repo

- _(none — use `mapbox/streets-v12` or your Manfith dashboard style)_

## Map-related source files

- `dashboard/src/components/MapPicker.vue`
- `dashboard/src/components/MapPreview.vue`

Manfith `mapbox-gl` dependency: **^3.14.0** (Orood uses mapbox-gl ^3.x).
