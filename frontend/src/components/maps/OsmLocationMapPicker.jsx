import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MapContainerSafe } from "@/components/maps/MapContainerSafe.jsx"
import { Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Navigation } from "lucide-react"
import { useMapRasterTiles } from "@/hooks/maps/useMapTheme"
import { usePrefersReducedMotion } from "@/hooks/maps/useMapInteractions"
import { reversePlace } from "@/lib/maps/geocoder"
import {
  DEFAULT_SA_OVERVIEW_ZOOM,
  getDefaultCenterFromEnv,
} from "@/lib/maps/constants"
import { MapPickerEmptyHint } from "@/components/maps/MapPickerEmptyHint.jsx"
import { MapSearchBar } from "@/components/maps/shell/MapSearchBar.jsx"
import { cn } from "@/lib/utils"
import { MAP_PICKER_MAP_CLASS } from "@/lib/maps/mapPickerUi"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function MapEvents({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function ResizeWhenActive({ active }) {
  const map = useMap()
  useEffect(() => {
    if (!active) return
    requestAnimationFrame(() => {
      try {
        map.invalidateSize()
      } catch {
        /* ignore */
      }
    })
  }, [active, map])
  return null
}

function FlyToPin({ lat, lng }) {
  const map = useMap()
  const reducedMotion = usePrefersReducedMotion()
  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!map || map._removed) return
    try {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: reducedMotion ? 0 : 0.45 })
    } catch {
      /* map mid-teardown */
    }
  }, [lat, lng, map, reducedMotion])
  return null
}

function SetViewWhenNoPin({ lat, lng }) {
  const map = useMap()
  const reducedMotion = usePrefersReducedMotion()
  const defaultCenter = useMemo(() => {
    const c = getDefaultCenterFromEnv()
    return [c.lat, c.lng]
  }, [])

  useEffect(() => {
    const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    if (hasPin) return
    map.setView(defaultCenter, DEFAULT_SA_OVERVIEW_ZOOM, { animate: !reducedMotion })
  }, [lat, lng, map, defaultCenter, reducedMotion])

  return null
}

/**
 * OpenStreetMap via Leaflet: click/drag pin, reverse geocode (Nominatim). No Google Places on address field.
 */
export function OsmLocationMapPicker({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  onGeocodeResolved,
  className = "",
  showInlineHint = true,
  showLocateControl = true,
  showSearch = false,
  searchPlaceholder,
  searchValue,
  hideMapAttribution = false,
  mapActive = true,
  readOnly = false,
  hintInFooter = false,
  markerVariant = "default",
  mapClassName: mapClassNameProp,
}) {
  const { t } = useTranslation()
  const raster = useMapRasterTiles()
  const initialCenter = useMemo(() => {
    const c = getDefaultCenterFromEnv()
    return [c.lat, c.lng]
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
  const skipReverseRef = useRef(false)

  useEffect(() => {
    if (readOnly) return undefined
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }
    if (skipReverseRef.current) {
      skipReverseRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const detail = await reversePlace(lat, lng, ac.signal)
        if (detail?.placeName && onReverseGeocode) {
          onReverseGeocode(detail.placeName, { lat, lng })
        }
        if (detail) onGeocodeResolved?.(detail)
      } catch {
        /* ignore abort / network */
      }
    }, 700)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [lat, lng, onReverseGeocode, onGeocodeResolved, readOnly])

  const hasPin = position != null
  const initialZoom = hasPin ? 13 : DEFAULT_SA_OVERVIEW_ZOOM

  const hintText = readOnly
    ? t("maps.propertyMapHint", "اسحب الخريطة للتحريك، وقرّب/بعّد بإصبعين أو عجلة الفأرة")
    : t("purchase.mapHint", "انقر على الخريطة أو اسحب الدبوس لتحديد موقع المعاينة")

  const handleSearchSelect = useCallback(
    (item) => {
      if (item?.lat == null || item?.lng == null) return
      skipReverseRef.current = true
      if (item.label && onReverseGeocode) {
        onReverseGeocode(item.label, { lat: item.lat, lng: item.lng })
      }
      handlePick(item.lat, item.lng)
    },
    [handlePick, onReverseGeocode]
  )

  const handleMarkerDragEnd = useCallback(
    (e) => {
      const ll = e.target.getLatLng()
      handlePick(ll.lat, ll.lng)
    },
    [handlePick]
  )

  const mapRemountKey = `${mapActive ? "on" : "off"}-${readOnly ? "ro" : "rw"}`

  const propertyPinIcon = useMemo(() => {
    if (markerVariant !== "property") return null
    return L.divIcon({
      className: "map-marker map-marker--property",
      html: '<span class="map-marker-pin map-marker-pin--property" aria-hidden="true"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
  }, [markerVariant])

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "overflow-visible rounded-2xl bg-muted/20 shadow-md ring-1 ring-border/50",
          hideMapAttribution && "map-picker-clean"
        )}
      >
        {showSearch && !readOnly ? (
          <div className="relative z-20 border-b border-border/40 p-3">
            <MapSearchBar
              debounceMs={500}
              placeholder={searchPlaceholder}
              resolvedValue={searchValue}
              onSelect={handleSearchSelect}
            />
          </div>
        ) : null}
        <div className={cn("relative z-0 overflow-hidden", mapClassNameProp ?? MAP_PICKER_MAP_CLASS)}>
          <MapContainerSafe
            remountKey={mapRemountKey}
            center={initialCenter}
            zoom={initialZoom}
            className={cn(
              "absolute inset-0 h-full w-full touch-manipulation",
              hideMapAttribution && "map-embed-preview"
            )}
            scrollWheelZoom
          >
            <ResizeWhenActive active={mapActive} />
            <SetViewWhenNoPin lat={lat} lng={lng} />
            <FlyToPin lat={lat} lng={lng} />
            <TileLayer
              attribution={hideMapAttribution ? "" : raster.attribution}
              url={raster.url}
            />
            {!readOnly ? <MapEvents onPick={handlePick} /> : null}
            {position ? (
              <Marker
                position={position}
                icon={propertyPinIcon ?? undefined}
                draggable={!readOnly}
                eventHandlers={readOnly ? undefined : { dragend: handleMarkerDragEnd }}
              />
            ) : null}
          </MapContainerSafe>
          {mapActive && !hasPin && !readOnly ? <MapPickerEmptyHint /> : null}
        </div>
        {showLocateControl && !readOnly ? (
          <div className="flex flex-wrap gap-2 border-t border-border/40 px-3 py-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleMyLocation}>
              <Navigation className="size-3.5 shrink-0" />
              {t("purchase.mapUseMyLocation", "موقعي الحالي")}
            </Button>
          </div>
        ) : null}
        {showInlineHint && hintInFooter ? (
          <div className="border-t border-border/40 bg-muted/30 px-3 py-2.5 text-start sm:px-4">
            <p className="text-xs leading-relaxed text-muted-foreground">{hintText}</p>
          </div>
        ) : null}
      </div>
      {showInlineHint && !hintInFooter ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hintText}</p>
      ) : null}
      {geoError ? <p className="text-xs text-destructive">{geoError}</p> : null}
    </div>
  )
}
