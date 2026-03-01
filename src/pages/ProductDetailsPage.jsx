import { useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/apiClient"
import { ImageGallery } from "@/features/offers/ImageGallery"
import { ProductInfo } from "@/features/offers/ProductInfo"
import { BidSection } from "@/features/offers/BidSection"
import { CommentSection } from "@/features/offers/CommentSection"
import { SimilarProductsSection } from "@/features/offers/SimilarProductsSection"
import { ProductStatsBar } from "@/features/offers/ProductStatsBar"
import { SellerInfoCard } from "@/features/offers/SellerInfoCard"
import { ProductActionButtons } from "@/features/offers/ProductActionButtons"
import { TrustGuarantees } from "@/features/offers/TrustGuarantees"
import { SellerControls } from "@/features/offers/SellerControls"
import { ContactBar } from "@/features/offers/ContactBar"
import { useAuthStore } from "@/store/useAuthStore"
import { useTranslation } from "react-i18next"

const formatPrice = (price, t) => {
  if (price == null || price === undefined) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Product details page: single-column, scroll-based, everything visible in one place.
 */
export function ProductDetailsPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user, token } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${id}`)
      return data?.data
    },
    enabled: Boolean(id),
  })

  const product = data
  const images = product?.media?.gallery ?? (product?.media?.image_url ? [product.media.image_url] : [])
  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  const hasPrice = product?.price != null && product?.price > 0
  const isRequest = product?.type === "request"

  useEffect(() => {
    if (!product) return
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const ogDesc = document.querySelector('meta[property="og:description"]')
    const ogImage = document.querySelector('meta[property="og:image"]')
    const img = product?.media?.image_url ?? product?.media?.cover ?? product?.image_url ?? ""
    const desc = product?.description?.slice(0, 160) ?? product?.title ?? ""
    const setMeta = (sel, attr, val) => {
      if (!sel) {
        const m = document.createElement("meta")
        m.setAttribute("property", attr)
        m.setAttribute("content", val)
        document.head.appendChild(m)
      } else sel.setAttribute("content", val)
    }
    setMeta(ogTitle, "og:title", product.title)
    setMeta(ogDesc, "og:description", desc)
    if (img) setMeta(ogImage, "og:image", img)
  }, [product])

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-[900px] space-y-8 px-4 py-8">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <>
      <div
        className={`
          mx-auto max-w-[900px] px-4 py-8
          ${!isOwner ? "pb-28 lg:pb-8" : ""}
        `}
      >
        <div className="space-y-2">
          {/* Seller controls (owner only) */}
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              <SellerControls product={product} />
            </div>
          )}

          {/* 1. Full-width product images */}
          <ImageGallery images={images} title={product.title} />

          {/* 2. Title + description */}
          <div className="rounded-2xl bg-card p-6 shadow-sm md:p-8">
            <ProductInfo product={product} />
          </div>

          {/* 3. Price (shown if set, hidden if not) */}
          {(hasPrice || isRequest || product?.accept_bids) && (
            <div className="rounded-2xl border bg-card p-6">
              {isRequest ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("productDetails.budgetLabel", "الميزانية (اختياري)")}
                  </p>
                  <p className="text-2xl font-bold">
                    {hasPrice ? formatPrice(product.price, t) : t("productDetails.openForOffers", "مفتوح للعروض")}
                  </p>
                </div>
              ) : (
                <>
                  {hasPrice ? (
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(product.price, t)}
                    </p>
                  ) : product?.accept_bids ? (
                    <p className="text-xl font-semibold text-muted-foreground">
                      {t("productDetails.openForOffers", "مفتوح للعروض")}
                    </p>
                  ) : (
                    <p className="text-xl font-semibold text-muted-foreground">
                      {t("feed.priceOnRequest")}
                    </p>
                  )}
                  {product?.is_wholesale && product?.wholesale_price != null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("wholesale.title")}: {formatPrice(product.wholesale_price, t)}
                      {product.min_quantity ? ` (${t("wholesale.minQuantity")} ${product.min_quantity})` : ""}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 4. Stats section */}
          <ProductStatsBar stats={product?.stats} />

          {/* 5. Seller info box */}
          <SellerInfoCard product={product} />

          {/* 6. Interaction buttons (stacked) */}
          {!isOwner && (
            <div className="rounded-2xl border bg-card p-6">
              <p className="mb-4 text-sm font-semibold text-muted-foreground">
                {t("productDetails.contactSeller", "تواصل مع البائع")}
              </p>
              <ProductActionButtons product={product} />
            </div>
          )}

          {/* 7. Bids section (وصل السوم) */}
          {product?.accept_bids && (
            <div id="bids-section">
              <BidSection product={product} />
            </div>
          )}

          {/* 8. Comments feed */}
          <CommentSection product={product} />

          {/* 9. كن مطمئن — full guarantees */}
          <TrustGuarantees />

          {/* 11. Similar products */}
          <SimilarProductsSection product={product} />
        </div>
      </div>

      {/* Mobile sticky contact bar */}
      {!isOwner && <ContactBar product={product} />}
    </>
  )
}
