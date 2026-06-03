import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { createMap } from "@/lib/maps/manfithAdapter"
import { mapboxForwardGeocode, reversePlace } from "@/lib/maps/geocoder"
import { MapShell } from "@/components/maps/shell/MapShell.jsx"
import { MapChrome } from "@/components/maps/shell/MapChrome.jsx"
import { MapSearchBar } from "@/components/maps/shell/MapSearchBar.jsx"
import { MapConfirmBar } from "@/components/maps/shell/MapConfirmBar.jsx"
import { useGeolocationPick } from "@/hooks/maps/useGeolocation.js"
import { getDefaultMapView } from "@/lib/maps/constants"
import { MapPickerEmptyHint } from "@/components/maps/MapPickerEmptyHint.jsx"
import { cn } from "@/lib/utils"
import { MAP_PICKER_MAP_CLASS } from "@/lib/maps/mapPickerUi"

/**
 * Mapbox GL location picker (Manfith engine). Click/drag pin; search + reverse geocode.
 */
export function MapboxLocationMapPicker({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  onGeocodeResolved,
  onPlaceResolved,
  onLoadFailed,
  onConfirm,
  addressInputRef,
  language = "en",
  className = "",
  showInlineHint = true,
  showConfirmBar = false,
  showZoomControls = true,
  showLocateControl = true,
  hideMapAttribution = false,
  mapActive = true,
  readOnly = false,
  hintInFooter = false,
  shellVariant = "default",
  showSearch = true,
  searchPlaceholder,
  searchValue,
  markerVariant = "default",
  mapClassName: mapClassNameProp,
}) {
  const { t, i18n } = useTranslation()
  const mapElRef = useRef(null)
  const mapApiRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
  const skipReverseRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const onReverseGeocodeRef = useRef(onReverseGeocode)
  const onGeocodeResolvedRef = useRef(onGeocodeResolved)
  const onLoadFailedRef = useRef(onLoadFailed)
  const onPlaceResolvedRef = useRef(onPlaceResolved)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)

  const lang = i18n.language || language

  onChangeRef.current = onChange
  onReverseGeocodeRef.current = onReverseGeocode
  onGeocodeResolvedRef.current = onGeocodeResolved
  onLoadFailedRef.current = onLoadFailed
  onPlaceResolvedRef.current = onPlaceResolved

  const notifyPick = useCallback((nextLat, nextLng) => {
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return
    onChangeRef.current?.({ lat: nextLat, lng: nextLng })
  }, [])

  const { requestLocation, error: geoError } = useGeolocationPick((la, ln) => {
    const api = mapApiRef.current
    if (api) {
      api.setMarker(la, ln, { draggable: true, variant: markerVariant })
      api.setCenter(la, ln, 14)
    }
    notifyPick(la, ln)
  })

  useEffect(() => {
    if (!mapActive) return undefined

    const el = mapElRef.current
    if (!el) return undefined

    let cancelled = false
    let cleanupClick = () => {}
    let cleanupDrag = () => {}

    setLoadError(null)
    setLoading(true)

    const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    const initialView = getDefaultMapView({ hasPin })

    createMap(el, {
      language: lang,
      center: initialView.center,
      zoom: initialView.zoom,
      attributionControl: !hideMapAttribution,
      onError: () => {
        if (typeof onLoadFailedRef.current === "function") onLoadFailedRef.current()
      },
    })
      .then((api) => {
        if (cancelled) {
          api.destroy()
          return
        }
        mapApiRef.current = api

        if (!readOnly) {
          cleanupDrag = api.onMarkerDragEnd((la, ln) => notifyPick(la, ln))
          cleanupClick = api.onMapClick((la, ln) => {
            api.setMarker(la, ln, { draggable: true, variant: markerVariant })
            api.setCenter(la, ln, 14)
            notifyPick(la, ln)
          })
        }

        if (hasPin) {
          api.setMarker(lat, lng, { draggable: !readOnly, variant: markerVariant })
          api.setCenter(lat, lng, 14)
        }

        requestAnimationFrame(() => {
          try {
            api.resize()
          } catch {
            /* ignore */
          }
        })
      })
      .catch((err) => {
        if (cancelled) return
        if (typeof onLoadFailedRef.current === "function") {
          onLoadFailedRef.current()
          return
        }
        setLoadError(err?.message === "manfith_map_token_missing" ? "missing_token" : "load")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (typeof cleanupClick === "function") cleanupClick()
      if (typeof cleanupDrag === "function") cleanupDrag()
      if (mapApiRef.current) {
        mapApiRef.current.destroy()
        mapApiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, hideMapAttribution, mapActive, readOnly])

  useEffect(() => {
    if (!mapActive) return
    const api = mapApiRef.current
    if (!api) return
    const resize = () => {
      try {
        api.resize()
      } catch {
        /* ignore */
      }
    }
    requestAnimationFrame(resize)
    if (api.map?.isStyleLoaded?.()) resize()
    else api.map?.once?.("load", resize)
  }, [mapActive])

  useEffect(() => {
    const api = mapApiRef.current
    if (!api || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    api.setMarker(lat, lng, { draggable: !readOnly, variant: markerVariant })
    api.setCenter(lat, lng, 14)
  }, [lat, lng, readOnly, markerVariant])

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
        const detail = await reversePlace(lat, lng, ac.signal, lang)
        if (!detail) return
        if (detail.placeName && onReverseGeocodeRef.current) {
          onReverseGeocodeRef.current(detail.placeName, { lat, lng })
        }
        onGeocodeResolvedRef.current?.(detail)
      } catch {
        /* ignore */
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [lat, lng, lang, readOnly])

  useEffect(() => {
    const input = addressInputRef?.current
    if (!input) return undefined

    const onKeyDown = async (e) => {
      if (e.key !== "Enter") return
      e.preventDefault()
      const q = input.value?.trim()
      if (q.length < 2) return
      const ac = new AbortController()
      const results = await mapboxForwardGeocode(q, ac.signal, lang)
      const first = results[0]
      if (!first) return
      const api = mapApiRef.current
      if (api) {
        api.setMarker(first.lat, first.lng, { draggable: true, variant: markerVariant })
        api.setCenter(first.lat, first.lng, 14)
      }
      notifyPick(first.lat, first.lng)
      onPlaceResolvedRef.current?.(first.label, first.lat, first.lng, {})
    }

    input.addEventListener("keydown", onKeyDown)
    return () => input.removeEventListener("keydown", onKeyDown)
  }, [addressInputRef, lang, notifyPick])

  const handleSearchSelect = (item) => {
    const api = mapApiRef.current
    if (api) {
      api.setMarker(item.lat, item.lng, { draggable: true, variant: markerVariant })
      api.setCenter(item.lat, item.lng, 14)
    }
    skipReverseRef.current = true
    if (item.label && onReverseGeocodeRef.current) {
      onReverseGeocodeRef.current(item.label, { lat: item.lat, lng: item.lng })
    }
    notifyPick(item.lat, item.lng)
    onPlaceResolvedRef.current?.(item.label, item.lat, item.lng, {})
  }

  const zoomBy = (delta) => {
    const map = mapApiRef.current?.map
    if (!map) return
    map.easeTo({ zoom: map.getZoom() + delta, duration: 200 })
  }

  const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)

  const hintText = readOnly
    ? t("maps.propertyMapHint", "اسحب الخريطة للتحريك، وقرّب/بعّد بإصبعين أو عجلة الفأرة")
    : t("purchase.mapHint", "انقر على الخريطة أو اسحب الدبوس لتحديد موقع المعاينة")

  const hintFooter =
    showInlineHint && hintInFooter && !showConfirmBar ? (
      <p className="text-xs leading-relaxed text-muted-foreground">{hintText}</p>
    ) : null

  return (
    <div className={cn("space-y-2", className)}>
      {loadError === "missing_token" ? (
        <p className="text-xs text-destructive">{t("maps.mapboxTokenMissing")}</p>
      ) : loadError ? (
        <p className="text-xs text-destructive">{t("maps.mapboxLoadError")}</p>
      ) : null}

      <MapShell
        loading={loading}
        variant={shellVariant}
        clipOverflow={false}
        className={cn(hideMapAttribution && "map-picker-clean")}
        mapClassName={mapClassNameProp ?? MAP_PICKER_MAP_CLASS}
        header={
          showSearch && !readOnly ? (
            <div className="border-b border-border/40 p-3">
              <MapSearchBar
                onSelect={handleSearchSelect}
                language={lang}
                placeholder={searchPlaceholder}
                resolvedValue={searchValue}
              />
            </div>
          ) : null
        }
        footer={
          showConfirmBar && onConfirm ? (
            <MapConfirmBar onConfirm={onConfirm} disabled={lat == null || lng == null} />
          ) : (
            hintFooter
          )
        }
      >
        <div
          ref={mapElRef}
          className={cn(
            "absolute inset-0 h-full w-full touch-manipulation",
            hideMapAttribution && "map-embed-preview"
          )}
        />
        <MapChrome
          onLocate={requestLocation}
          onZoomIn={() => zoomBy(1)}
          onZoomOut={() => zoomBy(-1)}
          showZoom={showZoomControls}
          showLocate={showLocateControl && !readOnly}
        />
        {!hasPin && !loading && !readOnly ? <MapPickerEmptyHint /> : null}
      </MapShell>

      {showInlineHint && !hintInFooter && !showConfirmBar ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hintText}</p>
      ) : null}
      {addressInputRef && !showSearch ? (
        <p className="text-xs text-muted-foreground">{t("maps.mapboxAddressEnterHint")}</p>
      ) : null}
      {geoError ? <p className="text-xs text-destructive">{geoError}</p> : null}
    </div>
  )
}
