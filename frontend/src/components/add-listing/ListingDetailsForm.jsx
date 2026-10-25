import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUpload } from "@/components/ImageUpload"
import { useAppDirection } from "@/providers/DirectionProvider"

const BOX_STYLE = "rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"

export function ListingDetailsForm({
  title,
  description,
  imageUrls,
  priceEnabled = false,
  showPriceToggle = true,
  price,
  onChange,
  errors = {},
  type = "offer",
  realEstatePricing = false,
  pricePerMeter = "",
  awaitingMarketer = false,
  videoSlot = null,
  mapDisplay = "price",
  hasVideo = false,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const isValidUrl = (url) =>
    typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))
  const validUrls = (imageUrls || []).filter(isValidUrl)
  const minImages = 0
  const showPriceFields = showPriceToggle ? priceEnabled : true

  return (
    <TooltipProvider>
      <div dir={direction} className="space-y-0">
        {/* Title */}
        <div className={BOX_STYLE}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[14px] font-bold text-foreground">
              {t("addListing.titleLabel")}
              <span className="text-destructive">*</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="shrink-0 p-1 text-muted-foreground hover:text-foreground" aria-label={t("addListing.titleInfo")}>
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                {t("addListing.titleInfo")}
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t("addListing.titlePlaceholder")}
            className="mt-2 h-auto border-0 bg-transparent p-0 text-[14px] focus-visible:ring-0"
            dir={direction}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-destructive" role="alert">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className={cn(BOX_STYLE, "min-h-[120px]")}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[14px] font-bold text-foreground">
              {t("addListing.descriptionLabel")}
              <span className="text-destructive">*</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="shrink-0 p-1 text-muted-foreground hover:text-foreground" aria-label={t("addListing.descriptionInfo")}>
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                {t("addListing.descriptionInfo")}
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t("addListing.descriptionPlaceholder")}
            className="mt-2 min-h-[80px] border-0 bg-transparent p-0 text-[14px] focus-visible:ring-0"
            dir={direction}
            aria-invalid={!!errors.description}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-destructive" role="alert">{errors.description}</p>
          )}
        </div>

        {/* Images */}
        <div className={BOX_STYLE}>
          <span className="text-[14px] font-bold text-foreground">
            {t("addListing.imagesLabel")}
          </span>
          <ImageUpload value={validUrls} onChange={(urls) => onChange({ imageUrls: urls })} minImages={minImages} />
          {errors.imageUrls && (
            <p className="mt-1 text-sm text-destructive" role="alert">{errors.imageUrls}</p>
          )}
        </div>

        {/* «حمل الفيديو» sits right after the photos. */}
        {videoSlot}

        {/* Real-estate offers: total price + price per metre, both required (no «على السوم»). */}
        {realEstatePricing ? (
          <div className={BOX_STYLE}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="re-price" className="text-[14px] font-bold text-foreground">
                  {t("addListing.rePrice.total", "سعر العقار")} <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="re-price"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => onChange({ price: e.target.value })}
                    placeholder="0"
                    className="h-11 w-full max-w-[200px] rounded-md text-center text-[16px]"
                    dir="ltr"
                    aria-invalid={!!errors.price}
                  />
                  <span className="text-[13px] text-muted-foreground">{t("addListing.priceCurrency")}</span>
                </div>
                {errors.price ? <p className="text-sm text-destructive" role="alert">{errors.price}</p> : null}
              </div>
              <div className="space-y-2">
                <label htmlFor="re-price-per-meter" className="text-[14px] font-bold text-foreground">
                  {t("addListing.rePrice.perMeter", "سعر المتر")} <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="re-price-per-meter"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={pricePerMeter}
                    onChange={(e) => onChange({ pricePerMeter: e.target.value })}
                    placeholder="0"
                    className="h-11 w-full max-w-[200px] rounded-md text-center text-[16px]"
                    dir="ltr"
                    aria-invalid={!!errors.pricePerMeter}
                  />
                  <span className="text-[13px] text-muted-foreground">{t("addListing.rePrice.perMeterUnit", "ريال / م²")}</span>
                </div>
                {errors.pricePerMeter ? <p className="text-sm text-destructive" role="alert">{errors.pricePerMeter}</p> : null}
              </div>
              {/* «تريد ظهور العقار على الخارطة»: price pin or the property's video (Snap-style bubble). */}
              <fieldset className="space-y-2 sm:col-span-2 lg:col-span-1">
                <legend className="mb-2 text-[14px] font-bold text-foreground">
                  {t("addListing.mapDisplay.title", "تريد ظهور العقار على الخارطة")}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "price", label: t("addListing.mapDisplay.price", "سعر العقار") },
                    { id: "video", label: t("addListing.mapDisplay.video", "فيديو العقار") },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={cn(
                        "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors",
                        mapDisplay === opt.id ? "border-primary bg-primary/10 text-primary" : "border-input hover:border-primary/50",
                      )}
                    >
                      <Checkbox
                        checked={mapDisplay === opt.id}
                        onCheckedChange={() => onChange({ mapDisplay: opt.id })}
                        className="size-[18px] rounded-[3px]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {mapDisplay === "video" && !hasVideo ? (
                  <p className="text-[12px] text-amber-600 dark:text-amber-400">
                    {t("addListing.mapDisplay.needsVideo", "أرفق فيديو من «حمل الفيديو» أعلاه — بدونه يظهر السعر على الخارطة.")}
                  </p>
                ) : null}
              </fieldset>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              {awaitingMarketer
                ? t("addListing.rePrice.awaitingHint", "إعلان «طلب تسويق»: السعر الإجمالي يظهر للإدارة والمشتركين فقط، وسعر المتر يظهر للجميع.")
                : t("addListing.rePrice.requiredHint", "السعر وسعر المتر إلزاميان لجميع الإعلانات العقارية ويظهران على الخارطة.")}
            </p>
          </div>
        ) : (
        <>
        {/* Price — optional toggle on retail; amount only on wholesale */}
        <div className={BOX_STYLE}>
          {showPriceToggle ? (
            <label className="flex cursor-pointer items-start gap-3 py-1">
              <Checkbox
                checked={priceEnabled}
                onCheckedChange={(v) => onChange({ priceEnabled: !!v })}
                className="mt-0.5 size-[18px] rounded-[3px]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-bold text-foreground">
                  {t("addListing.priceEnabledCheckbox")}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {t("addListing.priceEnabledHint")}
                </span>
              </span>
            </label>
          ) : (
            <span className="text-[14px] font-bold text-foreground">{t("addListing.priceAmountLabel")}</span>
          )}
          {showPriceFields && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 gap-y-2",
                showPriceToggle && "mt-4 border-t border-border pt-4"
              )}
            >
              {showPriceToggle ? (
                <span className="text-[14px] font-bold text-foreground">
                  {t("addListing.priceAmountLabel")}
                </span>
              ) : null}
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => onChange({ price: e.target.value })}
                placeholder={t("addListing.pricePlaceholder")}
                className="h-11 w-[160px] rounded-md border border-input text-center text-[16px]"
                dir="ltr"
                aria-invalid={!!errors.price}
              />
              <span className="text-[13px] leading-tight text-muted-foreground">
                {t("addListing.priceCurrency")}
              </span>
            </div>
          )}
          {errors.price && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {errors.price}
            </p>
          )}
        </div>
        </>
        )}
      </div>
    </TooltipProvider>
  )
}
