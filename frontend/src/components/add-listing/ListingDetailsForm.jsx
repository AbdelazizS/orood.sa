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
      </div>
    </TooltipProvider>
  )
}
