import { lazy, Suspense } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Package } from "lucide-react"
import { isManfithEngineActive } from "@/lib/maps/provider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"
import { LazyMapEmbed } from "./LazyMapEmbed.jsx"
import { MapShell } from "@/components/maps/shell/MapShell.jsx"
import { getDefaultCenterFromEnv } from "@/lib/maps/constants"

const MapboxDeliveryEmbed = lazy(() => import("./MapboxDeliveryEmbed.jsx"))

/**
 * Delivery / shipping location map when coordinates exist; placeholder otherwise.
 */
export function DeliveryTrackingMap({
  lat,
  lng,
  label = "",
  originLat,
  originLng,
  className = "",
  mapHeightClass = "min-h-[220px] h-[260px] w-full",
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const mapsReady = useMapsRuntimeReady()
  const useMapbox = mapsReady && isManfithEngineActive()

  const hasCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))

  if (!hasCoords) {
    return (
      <div
        dir={direction}
        className={`flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground ${className}`}
      >
        <Package className="size-8 opacity-60" aria-hidden />
        <p className="m-0 max-w-sm">{t("maps.trackingPlaceholder")}</p>
      </div>
    )
  }

  const hub = getDefaultCenterFromEnv()
  const routeOriginLat = originLat ?? hub.lat
  const routeOriginLng = originLng ?? hub.lng

  if (useMapbox) {
    return (
      <MapShell className={className} mapClassName={mapHeightClass}>
        <Suspense fallback={<div className={mapHeightClass} aria-hidden />}>
          <MapboxDeliveryEmbed
            lat={Number(lat)}
            lng={Number(lng)}
            label={label || t("orders.confirmedDeliveryLocation", "موقع التسليم")}
            originLat={routeOriginLat}
            originLng={routeOriginLng}
            mapClassName={`h-full w-full ${mapHeightClass}`}
          />
        </Suspense>
      </MapShell>
    )
  }

  const markers = [
    {
      id: "delivery",
      lat: Number(lat),
      lng: Number(lng),
      label: label || t("orders.confirmedDeliveryLocation", "موقع التسليم"),
      variant: "delivery",
    },
  ]

  return (
    <MapShell className={className} mapClassName={mapHeightClass}>
      <LazyMapEmbed
        markers={markers}
        interactive
        flyToPrimary
        showPopups
        zoom={14}
        mapClassName={`h-full w-full ${mapHeightClass}`}
      />
    </MapShell>
  )
}
