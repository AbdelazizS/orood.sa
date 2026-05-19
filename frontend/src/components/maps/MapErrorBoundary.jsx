import { Component } from "react"
import { useTranslation } from "react-i18next"
import { OsmLocationMapPicker } from "./OsmLocationMapPicker.jsx"
import { LeafletMapEmbed } from "./LeafletMapEmbed.jsx"

/**
 * Catches map render errors and falls back to OSM/Leaflet.
 */
export class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[maps] MapErrorBoundary", error)
    }
    this.props.onError?.(error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    const { fallback = "picker", fallbackProps = {} } = this.props
    if (fallback === "embed") {
      return <LeafletMapEmbed {...fallbackProps} />
    }
    return <OsmLocationMapPicker {...fallbackProps} />
  }
}

export function MapErrorFallbackMessage() {
  const { t } = useTranslation()
  return <p className="text-xs text-amber-700 dark:text-amber-400">{t("maps.mapboxFallbackOsm")}</p>
}
