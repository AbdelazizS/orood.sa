import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/store/useAuthStore"
import { formatShortPrice } from "@/lib/formatShortPrice"
import { Button } from "@/components/ui/button"
import { Home, MapPin, MessageCircleQuestion } from "lucide-react"

/**
 * The property a video is about: price, place, "عرض العقار" and "اسأل عن العقار"
 * (opens a private conversation with the company about this listing).
 */
export function LinkedListingCard({ product, company }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  if (!product) return null

  const awaiting = product.marketing_status === "awaiting_marketer" && product.price == null
  const price = formatShortPrice(product.price, i18n.language)
  const place = [product.city, product.district].filter(Boolean).join(" · ")
  const isOwner = user && company && Number(user.id) === Number(company.user_id)
  const canAsk = !isOwner && user?.role !== "subscriber" && company?.user_id

  const ask = () => {
    const target = `/dashboard/messages?with=${company.user_id}&product=${product.id}`
    if (!user) navigate("/login", { state: { redirectTo: target } })
    else navigate(target)
  }

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Home className="size-6" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[11px] font-semibold text-muted-foreground">{t("companyChannel.linkedListing", "العقار في هذا الفيديو")}</p>
        <Link to={`/products/${product.id}`} className="truncate text-sm font-semibold hover:underline">
          {product.title}
        </Link>
        <p className="text-sm font-bold text-primary">
          {awaiting
            ? t("realEstate.awaitingMarketing", "بانتظار التسويق")
            : price
              ? `${price} ${t("common.currency", "ريال")}`
              : t("listingsMap.noPrice", "على السوم")}
        </p>
        {place ? (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {place}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to={`/products/${product.id}`}>{t("companyChannel.viewListing", "عرض العقار")}</Link>
          </Button>
          {canAsk ? (
            <Button size="sm" className="gap-1.5" onClick={ask}>
              <MessageCircleQuestion className="size-4" aria-hidden />
              {t("companyChannel.askAboutListing", "اسأل عن العقار")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
