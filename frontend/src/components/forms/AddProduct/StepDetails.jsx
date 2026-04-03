import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/ImageUpload"

export function StepDetails({
  type,
  config,
  title,
  description,
  imageUrls,
  price,
  addPrice,
  onChange,
  disabled,
}) {
  const { t } = useTranslation()
  const cfg = config ?? { requireImages: true, minImages: 1 }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">{t("addOffer.titleLabel")} *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={
            type === "request"
              ? t("addProduct.requestTitlePlaceholder", "What are you looking for?")
              : t("addOffer.titleLabel")
          }
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("addOffer.descriptionLabel")} *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t(cfg.descriptionHintKey, "Describe your product or what you need")}
          rows={5}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>
          {t("addOffer.imagesLabel")}
          {cfg.requireImages && " *"}
        </Label>
        <ImageUpload
          value={imageUrls}
          onChange={(urls) => onChange({ imageUrls: urls })}
          disabled={disabled}
          minImages={cfg.minImages}
        />
        <p className="text-xs text-muted-foreground">
          {t(cfg.imagesHintKey, type === "request" ? "Optional — helps buyers understand" : "At least one image required")}
        </p>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="addPrice">{t("addProduct.addPrice", "Add price?")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("addProduct.addPriceHint", "Optional — leave off for price on request")}
          </p>
        </div>
        <Switch
          id="addPrice"
          checked={addPrice}
          onCheckedChange={(v) => onChange({ addPrice: v, price: v ? price : "" })}
          disabled={disabled}
        />
      </div>
      {addPrice && (
        <div className="space-y-2">
          <Label htmlFor="price">{t("addOffer.priceLabel")}</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => onChange({ price: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
