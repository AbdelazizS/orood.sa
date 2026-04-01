import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"

/**
 * Type selector — two checkboxes عرض / طلب, RTL.
 * Checkbox 18x18, border #ccc, square.
 */
export function TypeSelector({ value, onChange }) {
  const { t } = useTranslation()

  return (
    <div
      className="flex items-center justify-center gap-10 rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"
      dir="rtl"
    >
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={value === "offer"}
          onCheckedChange={(v) => v && onChange("offer")}
          className="size-[18px] rounded-[3px]"
        />
        <span className="text-[15px] text-foreground">
          {t("addListing.typeOffer")}
        </span>
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={value === "request"}
          onCheckedChange={(v) => v && onChange("request")}
          className="size-[18px] rounded-[3px]"
        />
        <span className="text-[15px] text-foreground">
          {t("addListing.typeRequest")}
        </span>
      </label>
    </div>
  )
}
