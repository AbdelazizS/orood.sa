import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Navigation } from "lucide-react"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function parseEnvCoord(val, fallback) {
  const n = Number.parseFloat(String(val ?? "").trim())
  return Number.isFinite(n) ? n : fallback
}

const RIYADH = [24.7136, 46.6753]

function MapEvents({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FlyToPin({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.45 })
  }, [lat, lng, map])
  return null
}

async function reverseGeocodeNominatim(lat, lng, signal, attempt = 0) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "json")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lon", String(lng))
  url.searchParams.set("accept-language", "ar,en")
  try {
    const res = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AroothMarketplace/1.0 (view-at-location)",
      },
    })
    if (!res.ok) {
      if (attempt < 1 && !signal.aborted) {
        await new Promise((r) => setTimeout(r, 1000))
        return reverseGeocodeNominatim(lat, lng, signal, attempt + 1)
      }
      return null
    }
    const data = await res.json()
    const label = data?.display_name
    return typeof label === "string" && label.trim() ? label.trim() : null
  } catch {
    if (attempt < 1 && !signal.aborted) {
      await new Promise((r) => setTimeout(r, 1000))
      return reverseGeocodeNominatim(lat, lng, signal, attempt + 1)
    }
    return null
  }
}

/**
 * OpenStreetMap via Leaflet: click/drag pin, reverse geocode (Nominatim). No Google Places on address field.
 */
export function OsmLocationMapPicker({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  className = "",
}) {
  const { t } = useTranslation()
  const initialCenter = useMemo(() => {
    const la = parseEnvCoord(import.meta.env.VITE_MAP_DEFAULT_LAT, RIYADH[0])
    const ln = parseEnvCoord(import.meta.env.VITE_MAP_DEFAULT_LNG, RIYADH[1])
    return [la, ln]
  }, [])

  const position =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null

  const handlePick = useCallback(
    (nextLat, nextLng) => {
      onChange({ lat: nextLat, lng: nextLng })
    },
    [onChange]
  )

  const geoBusyRef = useRef(false)
  const [geoError, setGeoError] = useState(null)

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t("purchase.mapGeolocationUnsupported", "المتصفح لا يدعم تحديد الموقع"))
      return
    }
    if (geoBusyRef.current) return
    geoBusyRef.current = true
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoBusyRef.current = false
        handlePick(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        geoBusyRef.current = false
        setGeoError(t("purchase.mapGeolocationDenied", "تعذّر الحصول على موقعك. اختر الموقع على الخريطة."))
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    )
  }, [handlePick, t])

  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!onReverseGeocode || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const addr = await reverseGeocodeNominatim(lat, lng, ac.signal)
        if (addr) onReverseGeocode(addr)
      } catch {
        /* ignore abort / network */
      }
    }, 700)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [lat, lng, onReverseGeocode])

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative z-0 overflow-hidden rounded-md border border-border">
        <MapContainer
          center={initialCenter}
          zoom={11}
          className="h-[220px] w-full touch-manipulation"
          scrollWheelZoom
        >
          <FlyToPin lat={lat} lng={lng} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onPick={handlePick} />
          {position ? (
            <Marker
              position={position}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng()
                  handlePick(ll.lat, ll.lng)
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleMyLocation}>
          <Navigation className="size-3.5 shrink-0" />
          {t("purchase.mapUseMyLocation", "موقعي الحالي")}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {t("purchase.mapHint", "انقر على الخريطة أو اسحب الدبوس لتحديد موقع المعاينة")}
        </p>
      </div>
      {geoError ? <p className="text-xs text-destructive">{geoError}</p> : null}
    </div>
  )
}
