import { useCallback, useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Navigation } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAP_PICKER_MAP_CLASS } from "@/lib/maps/mapPickerUi"

const loads = new Map()

function loadGoogleMaps(language) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    return Promise.reject(new Error("missing_key"))
  }
  const lang = String(language || "").toLowerCase().startsWith("ar") ? "ar" : "en"
  if (!loads.has(lang)) {
    const loader = new Loader({
      apiKey: key,
      version: "weekly",
      libraries: ["places"],
      language: lang,
      region: "SA",
    })
    loads.set(lang, loader.load())
  }
  return loads.get(lang)
}

function parseEnvCoord(val, fallback) {
  const n = Number.parseFloat(String(val ?? "").trim())
  return Number.isFinite(n) ? n : fallback
}

const RIYADH = { lat: 24.7136, lng: 46.6753 }

/**
 * Google Map: click or drag marker. Places Autocomplete on `addressInputRef` when provided.
 */
function reverseGeocodeWithRetry(lat, lng, onReverseGeocode, maxAttempts = 3) {
  if (!window.google?.maps?.Geocoder) return
  const geocoder = new window.google.maps.Geocoder()
  const run = (attempt) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]?.formatted_address) {
        onReverseGeocode(results[0].formatted_address)
        return
      }
      if (
        attempt + 1 < maxAttempts &&
        (status === "OVER_QUERY_LIMIT" || status === "UNKNOWN_ERROR")
      ) {
        window.setTimeout(() => run(attempt + 1), 700 * (attempt + 1))
      }
    })
  }
  run(0)
}

export function GoogleLocationMapPicker({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  onPlaceResolved,
  onLoadFailed,
  addressInputRef,
  language = "en",
  className = "",
  showInlineHint = true,
  mapClassName: mapClassNameProp,
}) {
  const { t } = useTranslation()
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const listenersRef = useRef([])
  const debounceRef = useRef(null)
  const [loadError, setLoadError] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const geoBusyRef = useRef(false)

  const defaultCenter = useRef({
    lat: parseEnvCoord(import.meta.env.VITE_MAP_DEFAULT_LAT, RIYADH.lat),
    lng: parseEnvCoord(import.meta.env.VITE_MAP_DEFAULT_LNG, RIYADH.lng),
  })

  const notifyPick = useCallback(
    (nextLat, nextLng) => {
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return
      onChange({ lat: nextLat, lng: nextLng })
    },
    [onChange]
  )

  const ensureMarker = useCallback(
    (maps, map, position) => {
      if (markerRef.current) {
        markerRef.current.setPosition(position)
        markerRef.current.setMap(map)
        return markerRef.current
      }
      const marker = new maps.Marker({
        map,
        position,
        draggable: true,
      })
      const dragListener = marker.addListener("dragend", () => {
        const p = marker.getPosition()
        if (!p) return
        notifyPick(p.lat(), p.lng())
      })
      listenersRef.current.push(dragListener)
      markerRef.current = marker
      return marker
    },
    [notifyPick]
  )

  useEffect(() => {
    const el = mapElRef.current
    if (!el) return undefined

    let cancelled = false
    setLoadError(null)

    loadGoogleMaps(language)
      .then((maps) => {
        if (cancelled || !mapElRef.current) return
        const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
        const center = hasPin ? { lat, lng } : defaultCenter.current
        const map = new maps.Map(el, {
          center,
          zoom: hasPin ? 14 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        mapRef.current = map

        if (hasPin) {
          ensureMarker(maps, map, { lat, lng })
        }

        const clickListener = map.addListener("click", (e) => {
          const ll = e.latLng
          if (!ll) return
          ensureMarker(maps, map, ll)
          notifyPick(ll.lat(), ll.lng())
        })
        listenersRef.current.push(clickListener)

        const attachAutocomplete = () => {
          const input = addressInputRef?.current
          if (!input || !maps.places) return
          const ac = new maps.places.Autocomplete(input, {
            fields: ["geometry", "formatted_address", "place_id"],
          })
          const placeListener = ac.addListener("place_changed", () => {
            const place = ac.getPlace()
            const geom = place?.geometry?.location
            const addr = typeof place?.formatted_address === "string" ? place.formatted_address.trim() : ""
            const placeId = typeof place?.place_id === "string" ? place.place_id : null
            if (!geom) return
            const la = geom.lat()
            const ln = geom.lng()
            ensureMarker(maps, map, { lat: la, lng: ln })
            map.panTo({ lat: la, lng: ln })
            map.setZoom(Math.max(map.getZoom(), 14))
            notifyPick(la, ln)
            if (onPlaceResolved && addr) onPlaceResolved(addr, la, ln, { placeId })
          })
          listenersRef.current.push(placeListener)
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(attachAutocomplete)
        })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err?.message === "missing_key" ? "missing_key" : "load"
        if (msg === "load" && typeof onLoadFailed === "function") {
          onLoadFailed()
          return
        }
        setLoadError(msg)
      })

    return () => {
      cancelled = true
      listenersRef.current.forEach((l) => {
        try {
          window.google?.maps?.event?.removeListener(l)
        } catch {
          /* ignore */
        }
      })
      listenersRef.current = []
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- full map+autocomplete rebuild on language
  }, [language, ensureMarker, notifyPick, onPlaceResolved, onLoadFailed, addressInputRef])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    const pos = { lat, lng }
    marker.setPosition(pos)
    map.panTo(pos)
  }, [lat, lng])

  useEffect(() => {
    if (!onReverseGeocode || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!window.google?.maps?.Geocoder) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      reverseGeocodeWithRetry(lat, lng, onReverseGeocode)
    }, 600)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [lat, lng, onReverseGeocode])

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
        const nextLat = pos.coords.latitude
        const nextLng = pos.coords.longitude
        const map = mapRef.current
        if (map && window.google?.maps) {
          ensureMarker(window.google.maps, map, { lat: nextLat, lng: nextLng })
          map.panTo({ lat: nextLat, lng: nextLng })
          map.setZoom(Math.max(map.getZoom(), 14))
        }
        notifyPick(nextLat, nextLng)
      },
      () => {
        geoBusyRef.current = false
        setGeoError(t("purchase.mapGeolocationDenied", "تعذّر الحصول على موقعك. اختر الموقع على الخريطة."))
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    )
  }, [ensureMarker, notifyPick, t])

  return (
    <div className={`space-y-2 ${className}`}>
      {loadError === "missing_key" ? (
        <p className="text-xs text-destructive">{t("purchase.mapGoogleKeyMissing")}</p>
      ) : loadError ? (
        <p className="text-xs text-destructive">{t("purchase.mapLoadError")}</p>
      ) : null}
      <div className="relative z-0 overflow-hidden rounded-md border border-border">
        <div ref={mapElRef} className={cn(mapClassNameProp ?? MAP_PICKER_MAP_CLASS, "touch-manipulation")} />
      </div>
      <div className="flex flex-wrap items-center justify-start gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleMyLocation}>
          <Navigation className="size-3.5 shrink-0" />
          {t("purchase.mapUseMyLocation", "موقعي الحالي")}
        </Button>
        {showInlineHint ? (
          <p className="min-w-0 flex-1 text-[11px] text-muted-foreground sm:flex-initial">
            {t("purchase.mapHint", "انقر على الخريطة أو اسحب الدبوس لتحديد موقع المعاينة")}
          </p>
        ) : null}
      </div>
      {geoError ? <p className="text-xs text-destructive">{geoError}</p> : null}
    </div>
  )
}
