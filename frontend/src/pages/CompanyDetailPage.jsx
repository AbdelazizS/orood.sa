import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Loader2, MapPin } from "lucide-react"
import { ProductCard } from "@/components/feed/cards/ProductCard"

export function CompanyDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/companies/${id}`)
      return res?.data
    },
    enabled: Boolean(id),
  })

  const company = data?.company
  const products = data?.products ?? []
  const mapUrl =
    company?.lat != null && company?.lng != null
      ? `https://www.google.com/maps?q=${company.lat},${company.lng}`
      : null

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-muted-foreground" dir={direction}>
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (isError || !company) {
    return (
      <p className="p-6 text-destructive" dir={direction}>
        {t("common.errorGeneric")}
      </p>
    )
  }

  return (
    <section className="min-h-[400px] bg-background px-4 py-6 sm:px-6" dir={direction}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[company.city, company.region].filter(Boolean).join(" â€” ")}
        </p>
        {company.description ? (
          <p className="mt-4 text-foreground leading-relaxed whitespace-pre-wrap">{company.description}</p>
        ) : null}
        {mapUrl ? (
          <p className="mt-4">
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              <MapPin className="size-4" />
              {t("company.openMap")}
            </a>
          </p>
        ) : null}
        <h2 className="mt-8 text-lg font-semibold">{t("company.listingsFromCompany")}</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          {products.length === 0 ? (
            <p className="p-4 text-muted-foreground">{t("company.noProducts")}</p>
          ) : (
            products.map((p) => <ProductCard key={p.id} product={p} compact />)
          )}
        </div>
        <p className="mt-8 text-center">
          <Link to="/companies" className="text-sm font-medium text-primary hover:underline">
            {t("companies.backToList")}
          </Link>
        </p>
      </div>
    </section>
  )
}
