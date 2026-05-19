import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { createCompanyWholesaleProductsBulk } from "@/services/wholesaleService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelector } from "@/components/add-listing/CategorySelector"
import { LocationSelector } from "@/components/add-listing/LocationSelector"
import { ListingDetailsForm } from "@/components/add-listing/ListingDetailsForm"
import { WholesaleProductCard } from "@/components/wholesale/WholesaleProductCard"
import { getDirection } from "@/lib/direction"

const emptyShared = {
  category_id: "",
  subcategory_id: "",
  region_id: "",
  city_id: "",
  discount_percent: 35,
  min_buyers: 3,
  expires_at: "",
}

export function WholesaleBulkProductsBuilder({ companyName, user }) {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const queryClient = useQueryClient()
  const [shared, setShared] = useState(emptyShared)
  const [drafts, setDrafts] = useState([])
  const [uploadImages, setUploadImages] = useState([])

  const bulkMutation = useMutation({
    mutationFn: createCompanyWholesaleProductsBulk,
    onSuccess: () => {
      toast.success(t("wholesale.company.bulkProductsSuccess"))
      setDrafts([])
      setUploadImages([])
      setShared(emptyShared)
      queryClient.invalidateQueries({ queryKey: ["company", "wholesale", "products"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.company.bulkProductsError"))
    },
  })

  const previewProducts = useMemo(() => {
    const discount = Number(shared.discount_percent || 0)
    const minQ = Math.max(2, Number(shared.min_buyers || 3))
    return drafts.map((draft, index) => {
      const original = Number(draft.original_price || 0)
      const wholesale =
        original > 0 && discount > 0 ? Number((original * ((100 - discount) / 100)).toFixed(2)) : 0
      const reserved = Math.min(minQ - 1, 1)
      return {
        id: `bulk-preview-${index}`,
        title: draft.title,
        description: draft.description,
        price: original,
        wholesale_price: wholesale,
        discount_percent: discount,
        min_quantity: minQ,
        reserved_seats: reserved,
        remaining_needed: Math.max(0, minQ - reserved),
        progress_percentage: Math.round((reserved / minQ) * 100),
        media: { image_url: draft.image_urls?.[0], gallery: draft.image_urls },
        seller: { name: companyName, company: { name: companyName } },
      }
    })
  }, [drafts, shared.discount_percent, shared.min_buyers, companyName])

  const syncDraftsFromImages = (urls) => {
    setUploadImages(urls)
    setDrafts((prev) =>
      urls.map((url, index) => {
        const existing = prev[index]
        return {
          title: existing?.title ?? t("wholesale.company.bulkProductDefaultTitle", { n: index + 1 }),
          description: existing?.description ?? "",
          original_price: existing?.original_price ?? "",
          image_urls: [url],
        }
      })
    )
  }

  const submitBulkProducts = (status) => {
    if (!shared.category_id || !shared.region_id || !shared.city_id) {
      toast.error(t("wholesale.company.bulkProductsValidation"))
      return
    }
    if (drafts.length === 0) {
      toast.error(t("wholesale.company.bulkProductsNeedImages"))
      return
    }
    const invalid = drafts.find((d) => !d.title?.trim() || !(Number(d.original_price) > 0))
    if (invalid) {
      toast.error(t("wholesale.company.bulkProductsRowInvalid"))
      return
    }

    bulkMutation.mutate({
      category_id: Number(shared.category_id),
      subcategory_id: shared.subcategory_id ? Number(shared.subcategory_id) : null,
      region_id: Number(shared.region_id),
      city_id: Number(shared.city_id),
      discount_percent: Number(shared.discount_percent),
      min_buyers: Number(shared.min_buyers),
      expires_at: shared.expires_at || null,
      status,
      products: drafts.map((d) => ({
        title: d.title.trim(),
        description: d.description?.trim() || d.title.trim(),
        original_price: Number(d.original_price),
        image_urls: d.image_urls,
      })),
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>{t("wholesale.company.bulkProductsTitle")}</CardTitle>
          <CardDescription>{t("wholesale.company.bulkProductsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategorySelector
            categoryId={shared.category_id || null}
            subcategoryId={shared.subcategory_id || null}
            onChange={(categoryId, subcategoryId) =>
              setShared((p) => ({
                ...p,
                category_id: categoryId ? String(categoryId) : "",
                subcategory_id: subcategoryId ? String(subcategoryId) : "",
              }))
            }
          />
          <LocationSelector
            regionId={shared.region_id || null}
            cityId={shared.city_id || null}
            onChange={(regionId, cityId) =>
              setShared((p) => ({
                ...p,
                region_id: regionId ? String(regionId) : "",
                city_id: cityId ? String(cityId) : "",
              }))
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("wholesale.fields.discountPercent")}</Label>
              <Input
                type="number"
                value={shared.discount_percent}
                onChange={(e) => setShared((p) => ({ ...p, discount_percent: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("wholesale.fields.minBuyers")}</Label>
              <Input
                type="number"
                value={shared.min_buyers}
                onChange={(e) => setShared((p) => ({ ...p, min_buyers: Number(e.target.value || 0) }))}
              />
            </div>
          </div>

          <ListingDetailsForm
            title=""
            description=""
            imageUrls={uploadImages}
            priceEnabled={false}
            type="offer"
            onChange={(updates) => {
              if ("imageUrls" in updates) syncDraftsFromImages(updates.imageUrls ?? [])
            }}
          />

          {drafts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t("wholesale.company.bulkProductsRows")}</p>
              {drafts.map((draft, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-border/60 p-3 md:grid-cols-3">
                  <DraftFields
                    draft={draft}
                    index={index}
                    t={t}
                    setDrafts={setDrafts}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => submitBulkProducts("published")} disabled={bulkMutation.isPending}>
              {t("wholesale.company.publish")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submitBulkProducts("pending_review")}
              disabled={bulkMutation.isPending}
            >
              {t("wholesale.company.saveDraft")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewProducts.length > 0 ? (
        <div className="sticky top-24 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{t("wholesale.company.livePreview")}</p>
          <div className="wholesale-product-grid wholesale-product-grid--4" dir={dir}>
            {previewProducts.map((product) => (
              <WholesaleProductCard
                key={product.id}
                product={product}
                user={user}
                t={t}
                dir={dir}
                density="preview"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DraftFields({ draft, index, t, setDrafts }) {
  return (
    <>
      <div className="space-y-2 md:col-span-2">
        <Label>{t("wholesale.fields.title")}</Label>
        <Input
          value={draft.title}
          onChange={(e) =>
            setDrafts((rows) => rows.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)))
          }
        />
        <Label>{t("wholesale.fields.description")}</Label>
        <Textarea
          value={draft.description}
          onChange={(e) =>
            setDrafts((rows) => rows.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))
          }
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("wholesale.fields.originalPrice")}</Label>
        <Input
          type="number"
          value={draft.original_price}
          onChange={(e) =>
            setDrafts((rows) =>
              rows.map((row, i) => (i === index ? { ...row, original_price: e.target.value } : row))
            )
          }
        />
      </div>
    </>
  )
}


