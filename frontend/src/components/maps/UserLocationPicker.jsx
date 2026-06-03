import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  resolveMapProvider,
  resolveActiveStack,
  isManfithEngineExplicitlyRequested,
  isManfithEngineActive,
} from "@/lib/maps/provider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"
import { GoogleLocationMapPicker } from "./GoogleLocationMapPicker.jsx"
import { OsmLocationMapPicker } from "./OsmLocationMapPicker.jsx"
import { MapboxLocationMapPicker } from "./MapboxLocationMapPicker.jsx"
import { MapErrorBoundary } from "./MapErrorBoundary.jsx"
import { MAP_SKELETON_CLASS } from "@/lib/maps/mapPickerUi"

function OsmPickerSafe(props) {
  return (
    <MapErrorBoundary fallback="message">
      <OsmLocationMapPicker {...props} />
    </MapErrorBoundary>
  )
}

/**
 * Unified location picker — Mapbox (when token available), Google, or OSM fallback.
 */
export function UserLocationPicker({ showInlineHint = true, forceLegacy = false, ...props }) {
  const { t } = useTranslation()
  const mapsReady = useMapsRuntimeReady()
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false)
  const [mapboxLoadFailed, setMapboxLoadFailed] = useState(false)

  const osmPreferred = resolveMapProvider() === "osm"
  const manfithActive =
    mapsReady && !forceLegacy && isManfithEngineActive() && !mapboxLoadFailed
  const provider = resolveMapProvider()
  const useGoogle =
    mapsReady && !forceLegacy && !manfithActive && provider === "google" && !googleLoadFailed

  const handleGoogleLoadFailed = useCallback(() => {
    setGoogleLoadFailed(true)
  }, [])

  const handleMapboxLoadFailed = useCallback(() => {
    setMapboxLoadFailed(true)
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const stack = resolveActiveStack()
    // eslint-disable-next-line no-console
    console.debug("[maps] stack", { stack, requestedProvider: provider, manfithActive, mapsReady })
  }, [provider, useGoogle, manfithActive, mapsReady])

  if (!mapsReady) {
    return <div className={MAP_SKELETON_CLASS} aria-hidden />
  }

  if (forceLegacy) {
    return <OsmPickerSafe {...props} showInlineHint={showInlineHint} />
  }

  if (manfithActive) {
    return (
      <MapboxLocationMapPicker
        {...props}
        showInlineHint={showInlineHint}
        onLoadFailed={handleMapboxLoadFailed}
        showSearch={props.showSearch}
        searchPlaceholder={props.searchPlaceholder}
      />
    )
  }

  if (useGoogle) {
    return (
      <GoogleLocationMapPicker
        {...props}
        showInlineHint={showInlineHint}
        onLoadFailed={handleGoogleLoadFailed}
      />
    )
  }

  if (osmPreferred) {
    return <OsmPickerSafe {...props} showInlineHint={showInlineHint} />
  }

  return (
    <>
      {provider === "google" && googleLoadFailed ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">{t("purchase.mapFallbackOsm")}</p>
      ) : null}
      {import.meta.env.DEV && isManfithEngineExplicitlyRequested() && !isManfithEngineActive() ? (
        <p className="text-[11px] text-muted-foreground">{t("maps.manfithTokenMissingHint")}</p>
      ) : null}
      {mapboxLoadFailed ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">{t("maps.mapboxFallbackOsm")}</p>
      ) : null}
      <OsmPickerSafe {...props} showInlineHint={showInlineHint} />
    </>
  )
}
