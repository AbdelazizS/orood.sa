import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { WholesaleProductCard } from "@/components/wholesale/WholesaleProductCard"
import { getDirection } from "@/lib/direction"

export function WholesaleProductBuilderPreview({ form, companyName, user }) {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)

  const previewProduct = useMemo(() => {
    const original = Number(form.original_price || 0)
    const discount = Number(form.discount_percent || 0)
    const wholesale =
      original > 0 && discount > 0 ? Number((original * ((100 - discount) / 100)).toFixed(2)) : 0
    const minQ = Math.max(2, Number(form.min_buyers || 3))
    const previewReserved = Math.min(minQ - 1, Math.max(1, Math.floor(minQ / 2)))

    return {
      id: "preview",
      title: form.title?.trim() || t("wholesale.company.previewPlaceholderTitle"),
      description: form.description?.trim() || "",
      price: original,
      wholesale_price: wholesale,
      discount_percent: discount,
      min_quantity: minQ,
      reserved_seats: previewReserved,
      current_buyers: previewReserved,
      remaining_needed: Math.max(0, minQ - previewReserved),
      progress_percentage: Math.min(100, Math.round((previewReserved / minQ) * 100)),
      image_url: form.image_urls?.[0] ?? null,
      media: { gallery: form.image_urls ?? [], cover: form.image_urls?.[0] ?? null },
      seller: { name: companyName, company: { name: companyName } },
      is_wholesale: true,
    }
  }, [form, companyName, t])

  return (
    <div className="sticky top-24 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{t("wholesale.company.livePreview")}</p>
      <WholesaleProductCard product={previewProduct} user={user} t={t} dir={dir} density="preview" />
    </div>
  )
}

