import { useCallback, useEffect, useRef, useState } from "react"
import { Navigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Minus, Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"
import { ensureMapsRuntimeConfig } from "@/lib/maps/runtimeConfig"
import {
  createMap,
  getManfithEnvSummary,
  getManfithStyleUrl,
  isManfithMapConfigured,
} from "@/lib/maps/manfithAdapter"
import { getDefaultCenterFromEnv } from "@/lib/maps/constants"
import { mapboxReverseGeocode } from "@/lib/maps/geocoder"

/**
 * Isolated Mapbox (Manfith adapter) smoke test — dev only via route guard.
 */
export function MapsTestPage() {
  if (!import.meta.env.DEV) {
    return <Navigate to="/" replace />
  }

  return <MapsTestPageInner />
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="font-semibold text-foreground">{label}:</dt>
      <dd className="break-all">{value}</dd>
    </div>
  )
}

function MapsTestPageInner() {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const mapsReady = useMapsRuntimeReady()
  const mapElRef = useRef(null)
  const mapApiRef = useRef(null)
  const [loadError, setLoadError] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [pin, setPin] = useState(() => getDefaultCenterFromEnv())
  const [geocodeLabel, setGeocodeLabel] = useState("")
  const [geocodeBusy, setGeocodeBusy] = useState(false)
  const [summary, setSummary] = useState(() => getManfithEnvSummary())

  useEffect(() => {
    ensureMapsRuntimeConfig().then(() => setSummary(getManfithEnvSummary()))
  }, [mapsReady])

  const tokenReady = isManfithMapConfigured()

  useEffect(() => {
    if (!mapsReady || !tokenReady) return undefined
    const el = mapElRef.current
    if (!el) return undefined

    let cancelled = false
    setLoadError(null)
    setMapLoaded(false)

    createMap(el, {
      center: pin,
      zoom: 12,
      language: i18n.language,
    })
      .then((api) => {
        if (cancelled) {
          api.destroy()
          return
        }
        mapApiRef.current = api
        api.setMarker(pin.lat, pin.lng, { draggable: true })
        api.onMarkerDragEnd((lat, lng) => setPin({ lat, lng }))
        requestAnimationFrame(() => {
          api.resize()
          setMapLoaded(true)
        })
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err?.message === "manfith_map_token_missing"
            ? "missing_token"
            : "load"
        )
      })

    return () => {
      cancelled = true
      if (mapApiRef.current) {
        mapApiRef.current.destroy()
        mapApiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, tokenReady, i18n.language])

  useEffect(() => {
    const api = mapApiRef.current
    if (!api || !mapLoaded) return
    api.setMarker(pin.lat, pin.lng, { draggable: true })
    api.setCenter(pin.lat, pin.lng)
  }, [pin.lat, pin.lng, mapLoaded])

  const handleZoom = useCallback((delta) => {
    const map = mapApiRef.current?.map
    if (!map) return
    map.zoomTo(Math.min(20, Math.max(1, map.getZoom() + delta)), { duration: 300 })
  }, [])

  const handleReverseGeocode = useCallback(async () => {
    if (!isManfithMapConfigured()) return
    setGeocodeBusy(true)
    setGeocodeLabel("")
    try {
      const ac = new AbortController()
      const addr = await mapboxReverseGeocode(pin.lat, pin.lng, ac.signal, i18n.language)
      setGeocodeLabel(addr || t("mapsTest.geocodeEmpty"))
    } catch {
      setGeocodeLabel(t("mapsTest.geocodeFailed"))
    } finally {
      setGeocodeBusy(false)
    }
  }, [pin.lat, pin.lng, i18n.language, t])

  return (
    <section className="mx-auto max-w-3xl px-4 py-8" dir={direction}>
      <h1 className="text-xl font-bold text-foreground">{t("mapsTest.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("mapsTest.subtitle")}</p>

      <dl className="mt-4 grid gap-1 rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
        <SummaryRow label="token" value={summary.hasPublicToken ? "ok" : "missing"} />
        <SummaryRow label="vendor" value={summary.vendorCloned ? "cloned" : "not cloned"} />
        <SummaryRow label="style" value={getManfithStyleUrl()} />
        <SummaryRow label="dir" value={direction} />
        <SummaryRow label="locale" value={i18n.language} />
        <SummaryRow label="pin" value={`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`} />
      </dl>

      {!mapsReady ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("mapsTest.loadingConfig")}</p>
      ) : null}

      {!isManfithMapConfigured() && mapsReady ? (
        <p className="mt-4 text-sm text-destructive">{t("maps.mapboxTokenMissing")}</p>
      ) : null}

      {loadError === "missing_token" ? (
        <p className="mt-4 text-sm text-destructive">{t("maps.mapboxTokenMissing")}</p>
      ) : null}
      {loadError === "load" ? (
        <p className="mt-4 text-sm text-destructive">{t("maps.mapboxLoadError")}</p>
      ) : null}

      <div
        ref={mapElRef}
        className="mt-4 min-h-[400px] w-full overflow-hidden rounded-xl border border-border"
        aria-label={t("mapsTest.mapAria")}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => handleZoom(1)} disabled={!mapLoaded}>
          <Plus className="size-4" />
          {t("mapsTest.zoomIn")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => handleZoom(-1)} disabled={!mapLoaded}>
          <Minus className="size-4" />
          {t("mapsTest.zoomOut")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={!mapLoaded || geocodeBusy}
          onClick={handleReverseGeocode}
        >
          <MapPin className="size-3.5" />
          {geocodeBusy ? t("mapsTest.geocodeBusy") : t("mapsTest.reverseGeocode")}
        </Button>
      </div>

      {geocodeLabel ? <p className="mt-2 text-sm text-foreground">{geocodeLabel}</p> : null}

      {mapLoaded ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("mapsTest.successHint")}</p>
      ) : null}
    </section>
  )
}
