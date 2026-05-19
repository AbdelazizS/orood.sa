import { lazy, Suspense, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MapShell } from "@/components/maps/shell/MapShell.jsx"
import { isManfithEngineActive } from "@/lib/maps/provider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"
import { InteractiveMap } from "@/components/maps/InteractiveMap.jsx"

const MapboxClusterEmbed = lazy(() => import("@/components/maps/MapboxClusterEmbed.jsx"))

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export function MapPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [searchParams, setSearchParams] = useSearchParams()
  const cityFilter = searchParams.get("city")?.trim() ?? ""
  const mapsReady = useMapsRuntimeReady()
  const useClusterMap = mapsReady && isManfithEngineActive()

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["companies", "map"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/companies", { params: { per_page: 100 } })
      return unwrapList(res)
    },
    staleTime: 1000 * 60 * 5,
  })

  const withCoords = useMemo(
    () => data.filter((c) => c.lat != null && c.lng != null),
    [data]
  )

  const filtered = useMemo(() => {
    if (!cityFilter) return withCoords
    const q = cityFilter.toLowerCase()
    return withCoords.filter((c) => String(c.city ?? "").toLowerCase().includes(q))
  }, [withCoords, cityFilter])

  const markers = filtered.map((c) => ({
    id: c.id,
    lat: Number(c.lat),
    lng: Number(c.lng),
    label: c.name,
    url: `/companies/${c.id}`,
  }))

  const setCity = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set("city", value.trim())
    else next.delete("city")
    setSearchParams(next, { replace: true })
  }

  return (
    <section className="min-h-[400px] bg-background px-4 py-6 sm:px-6" dir={direction}>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-bold text-foreground">{t("map.title")}</h1>
        <p className="mb-4 text-sm text-muted-foreground">{t("map.subtitle")}</p>

        <div className="mb-4">
          <Input
            value={cityFilter}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("maps.filterCity", "Filter by city…")}
            className="max-w-xs"
            aria-label={t("maps.filterCity", "Filter by city")}
          />
        </div>

        {isLoading && (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}

        {isError && <p className="text-destructive text-sm">{t("common.errorGeneric")}</p>}

        {!isLoading && !isError && withCoords.length === 0 && (
          <p className="text-muted-foreground">{t("map.noCoordinates")}</p>
        )}

        {!isLoading && !isError && withCoords.length > 0 && filtered.length === 0 && (
          <p className="text-muted-foreground">{t("maps.noCompaniesInCity", "No companies in this city.")}</p>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-4">
            <MapShell mapClassName="min-h-[320px] h-[420px] w-full">
              {useClusterMap ? (
                <Suspense fallback={<div className="h-full min-h-[320px] animate-pulse bg-muted" aria-hidden />}>
                  <MapboxClusterEmbed markers={markers} mapClassName="h-full min-h-[320px] w-full" />
                </Suspense>
              ) : (
                <InteractiveMap markers={markers} mapHeightClass="h-full min-h-[320px] w-full" className="h-full" />
              )}
            </MapShell>
            <ul className="space-y-3">
              {filtered.map((c) => (
                <li key={c.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
                    <div>
                      <Link to={`/companies/${c.id}`} className="font-semibold text-primary hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {[c.city, c.region].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 text-center">
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            {t("companies.backHome")}
          </Link>
        </p>
      </div>
    </section>
  )
}

