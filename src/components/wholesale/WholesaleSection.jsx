import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { useFiltersStore } from "@/store/useFiltersStore"

export function WholesaleSection() {
  const { t } = useTranslation()
  const { setActiveFilter } = useFiltersStore()

  const { data } = useQuery({
    queryKey: ["homepage", "wholesale"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/homepage/feed?filter=wholesale&per_page=8")
      return res
    },
  })

  const products = data?.data ?? []
  const hasProducts = products.length > 0

  return (
    <section id="sir-aljomla" className="space-y-4 rounded-3xl border bg-card/80 p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("filters.wholesale")}</p>
          <h2 className="text-xl font-bold">{t("wholesale.title")}</h2>
        </div>
        <button
          type="button"
          onClick={() => setActiveFilter("wholesale")}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t("common.all")}
        </button>
      </div>
      {hasProducts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="block">
              <div className="rounded-2xl border bg-background/60 overflow-hidden transition-colors hover:bg-muted/50">
                <div className="aspect-video bg-muted">
                  {p.media?.image_url ? (
                    <img src={p.media.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">—</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold truncate">{p.title}</p>
                  <p className="text-sm text-primary">
                    {p.wholesale_price != null ? `${p.wholesale_price} SAR` : t("feed.priceOnRequest")}
                    {p.min_quantity ? ` (${t("wholesale.minQuantity")} ${p.min_quantity})` : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("wholesale.empty", "No wholesale offers yet.")}</p>
      )}
    </section>
  )
}
