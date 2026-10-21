import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { ListingsPriceMap } from "@/components/maps/ListingsPriceMap.jsx"

/** The company's listings on the map (price pins), using /listings/map?user_id=. */
export function CompanyListingsMapTab({ userId }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data = [], isFetching } = useQuery({
    queryKey: ["listings", "map", "company", userId],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/listings/map", { params: { user_id: userId, per_page: 500 } })
      return Array.isArray(res?.data) ? res.data : []
    },
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })

  const markers = useMemo(
    () => data.map((m) => ({ ...m, lat: Number(m.lat), lng: Number(m.lng) })).filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    [data],
  )

  return (
    <div className="relative h-[60vh] min-h-[360px] overflow-hidden rounded-xl border border-border">
      <ListingsPriceMap markers={markers} fitKey={`company-${userId}`} onSelect={(m) => navigate(m.url ?? `/products/${m.id}`)} />
      {!isFetching && markers.length === 0 ? (
        <span className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow">
          {t("companyChannel.noMapListings", "لا توجد عقارات بموقع على الخارطة")}
        </span>
      ) : null}
    </div>
  )
}
