import { useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useFiltersStore } from "@/store/useFiltersStore"
import { MapShell } from "@/components/maps/shell/MapShell.jsx"
import { InteractiveMap } from "@/components/maps/InteractiveMap.jsx"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

export function ListingsMapPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [searchParams] = useSearchParams()
  const { cityId, rePurpose, rePropertyType, categoryId } = useFiltersStore()
  const realEstateOnly = searchParams.get("real_estate_only") === "1"

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["listings", "map", cityId, rePurpose, rePropertyType, categoryId, realEstateOnly],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/listings/map", {
        params: {
          city_id: cityId || undefined,
          purpose: rePurpose || undefined,
          property_type: rePropertyType || undefined,
          category_id: categoryId || undefined,
          real_estate_only: realEstateOnly ? 1 : undefined,
          per_page: 300,
        },
      })
      return Array.isArray(res?.data) ? res.data : []
    },
    staleTime: 60_000,
  })

  const markers = useMemo(
    () =>
      data.map((m) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        label: m.title,
        href: m.url ?? `/products/${m.id}`,
        price: m.price,
      })),
    [data],
  )

  return (
    <div dir={direction} className="min-h-screen bg-background pb-24">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t("common.back", "رجوع")}
          </Link>
        </Button>
        <h1 className="mt-2 text-lg font-bold">{t("realEstate.mapBrowse", "خريطة العقارات")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("realEstate.mapCount", { count: markers.length, defaultValue: "{{count}} إعلان على الخريطة" })}
        </p>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <MapShell className="h-[min(70vh,560px)] w-full overflow-hidden rounded-xl border border-border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="flex h-full items-center justify-center text-sm text-destructive">
              {t("common.error")}
            </p>
          ) : (
            <InteractiveMap markers={markers} mapHeightClass="h-full min-h-[320px]" />
          )}
        </MapShell>
      </div>
    </div>
  )
}
