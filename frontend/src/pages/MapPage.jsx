import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Loader2, MapPin } from "lucide-react"

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export function MapPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["companies", "map"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/companies", { params: { per_page: 100 } })
      return unwrapList(res)
    },
    staleTime: 1000 * 60 * 5,
  })

  const withCoords = data.filter((c) => c.lat != null && c.lng != null)

  return (
    <section className="min-h-[400px] bg-background px-4 py-6 sm:px-6" dir={direction}>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-bold text-foreground">{t("map.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("map.subtitle")}</p>

        {isLoading && (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}

        {isError && <p className="text-destructive text-sm">{t("common.errorGeneric")}</p>}

        {!isLoading && !isError && withCoords.length === 0 && (
          <p className="text-muted-foreground">{t("map.noCoordinates")}</p>
        )}

        {!isLoading && !isError && withCoords.length > 0 && (
          <ul className="space-y-3">
            {withCoords.map((c) => (
              <li key={c.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
                  <div>
                    <Link to={`/companies/${c.id}`} className="font-semibold text-primary hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {[c.city, c.region].filter(Boolean).join(" â€” ")}
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                  >
                    <MapPin className="size-4" />
                    {t("map.openInMaps")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
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
