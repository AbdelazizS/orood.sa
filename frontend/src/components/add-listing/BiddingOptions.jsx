import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

/**
 * BIDDING OPTIONS (سوم) — Section 6 per PDF spec.
 * User can allow customers to submit price offers.
 * Two modes: Public (highest bid visible) / Hidden (only seller sees bids).
 */
export function BiddingOptions({ enabled, visible, onChange, form }) {
  const isFormMode = Boolean(form)
  const enabledVal = isFormMode ? form.watch("biddingEnabled") : enabled
  const visibleVal = isFormMode ? form.watch("biddingVisible") : visible
  const handleChange = isFormMode
    ? (updates) => {
        if ("enabled" in updates) {
          form.setValue("biddingEnabled", updates.enabled ?? false, { shouldValidate: true })
        }
        if ("visible" in updates) {
          form.setValue("biddingVisible", updates.visible ?? true, { shouldValidate: true })
        }
      }
    : onChange

  return (
    <BiddingOptionsInner
      enabled={enabledVal}
      visible={visibleVal}
      onChange={handleChange}
    />
  )
}

function BiddingOptionsInner({ enabled, visible, onChange }) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"
      dir="rtl"
    >
      <h3 className="text-sm font-bold text-foreground mb-3">
        {t("addListing.biddingSectionTitle")}
      </h3>
      <label className="flex cursor-pointer items-center gap-3 py-2">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) =>
            onChange({ enabled: !!v, visible: v ? visible : true })
          }
          className="size-[18px] rounded-[3px]"
        />
        <span className="text-[14px] text-foreground">
          {t("addListing.biddingAllowLabel")}
        </span>
      </label>
      {enabled && (
        <RadioGroup
          value={visible ? "public" : "hidden"}
          onValueChange={(v) => onChange({ visible: v === "public" })}
          className="mt-3 ms-6 flex flex-col gap-3"
        >
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors",
              visible
                ? "border-primary bg-primary/5"
                : "border-border bg-transparent"
            )}
          >
            <RadioGroupItem value="public" id="bid-public" className="mt-0.5" />
            <div className="flex-1">
              <span className="text-[14px] font-medium text-foreground block">
                {t("addListing.biddingPublicLabel")}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                {t("addListing.biddingPublicExample")}
              </span>
            </div>
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors",
              !visible
                ? "border-primary bg-primary/5"
                : "border-border bg-transparent"
            )}
          >
            <RadioGroupItem value="hidden" id="bid-hidden" className="mt-0.5" />
            <div className="flex-1">
              <span className="text-[14px] font-medium text-foreground block">
                {t("addListing.biddingHiddenLabel")}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                {t("addListing.biddingHiddenExample")}
              </span>
            </div>
          </label>
        </RadioGroup>
      )}
    </div>
  )
}
